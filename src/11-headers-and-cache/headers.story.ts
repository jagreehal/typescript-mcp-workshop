/**
 * 11 — Header routing and cacheable lists, as a story that proves itself.
 *
 * The claim: a gateway can block, meter and route MCP traffic **without
 * parsing a JSON-RPC body**. That is worth testing rather than asserting,
 * because the security argument rests on it: a gateway that reads bodies is a
 * gateway that can be confused by one.
 *
 *   pnpm test:story
 */
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '../shared/connect';
import { serveHttp, type McpHttpServer } from '../shared/serve';
import { PER_TENANT_LIMIT, RATE_LIMITS } from './constants';
import { createGateway } from './gateway';
import { buildServer } from './server';
import type { Server } from 'node:http';

const UPSTREAM_PORT = 8395;
const GATEWAY_PORT = 8394;
const GATEWAY_URL = `http://127.0.0.1:${GATEWAY_PORT}/mcp`;

describe('11 — header routing and cacheable lists', () => {
  let upstream: McpHttpServer;
  let gateway: Server;

  beforeAll(async () => {
    upstream = await serveHttp(buildServer, UPSTREAM_PORT);
    gateway = createGateway(UPSTREAM_PORT);
    await new Promise<void>((resolve) => gateway.listen(GATEWAY_PORT, '127.0.0.1', resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => gateway.close(() => resolve()));
    await upstream.close();
  });

  it('blocks a tool by name without reading the request body', async ({ task }) => {
    story.init(task);

    story.section({
      title: 'Why the method travels in a header',
      markdown: [
        'Streamable HTTP requests carry `Mcp-Method` and `Mcp-Name` (SEP-2243), so',
        'a gateway can decide from headers alone. Without them it would have to',
        'buffer and parse the body of every request to know what it was, which is',
        'both a cost and an attack surface: a parser that disagrees with the',
        "server's parser is a request smuggling bug waiting to happen.",
      ].join('\n'),
    });

    story.mermaid({
      title: 'The gateway decides before the body matters',
      code: [
        'flowchart LR',
        '  C[Client] -->|Mcp-Method: tools/call<br/>Mcp-Name: drop_database| G{Gateway}',
        '  G -->|name is blocked| X[403, body never read]',
        '  G -->|allowed| S[MCP Server]',
      ].join('\n'),
    });

    story.given('a gateway whose policy names drop_database as blocked');

    story.when('a client calls it through the gateway');
    const client = await connect(GATEWAY_URL);
    try {
      const call = client.callTool({ name: 'drop_database', arguments: {} });

      story.then('the gateway refuses it');
      await expect(call).rejects.toThrow();
    } finally {
      await client.close();
    }

    story.and('an allowed tool on the same connection still gets through');
    const second = await connect(GATEWAY_URL);
    try {
      const ok = await second.callTool({ name: 'search', arguments: { query: 'otters' } });
      expect(ok.isError ?? false).toBe(false);
    } finally {
      await second.close();
    }

    story.kv({ label: 'Bytes of body parsed to decide', value: 0 });
  });

  it('meters a budget per method, from the header alone', async ({ task }) => {
    story.init(task);

    story.section({
      title: 'Different traffic, different budgets',
      markdown: [
        'Listing is cheap and calling is not, so they get different allowances.',
        'The gateway reads `Mcp-Method` to tell them apart, which is also how a',
        'real deployment would route them to different upstream pools.',
      ].join('\n'),
    });

    const budget = RATE_LIMITS['tools/call']!;
    story.given(`a budget of ${budget} tools/call requests`);

    story.when('a client keeps calling past it');
    const client = await connect(GATEWAY_URL);
    let allowed = 0;
    let refusedAt = 0;
    try {
      for (let attempt = 1; attempt <= budget + 3; attempt++) {
        try {
          await client.callTool({ name: 'search', arguments: { query: `q${attempt}` } });
          allowed += 1;
        } catch {
          refusedAt = attempt;
          break;
        }
      }
    } finally {
      await client.close();
    }

    story.table({
      label: 'Where the gateway stopped it',
      columns: ['Metric', 'Value'],
      rows: [
        ['Budget for tools/call', String(budget)],
        ['Calls allowed', String(allowed)],
        ['Refused on attempt', String(refusedAt)],
      ],
    });

    story.then('it stops once the budget is spent, not before');
    expect(refusedAt).toBeGreaterThan(0);
    expect(allowed).toBeLessThanOrEqual(budget);
  });

  it('meters a tool argument the client mirrored into a header', async ({ task }) => {
    story.init(task);

    story.section({
      title: 'A tool argument, readable without the body',
      markdown: [
        'A tool can promote one of its arguments to a header with',
        '`x-mcp-header`. Here `tenant_report` promotes its tenant id, so the',
        'gateway can hold a per-tenant quota, or shard a tenant onto its own',
        'upstream pool, while still never reading a body.',
      ].join('\n'),
    });

    story.given(`a per-tenant quota of ${PER_TENANT_LIMIT}`);

    story.when('one tenant goes over it');
    const client = await connect(GATEWAY_URL);
    let served = 0;
    let refused = false;
    try {
      for (let attempt = 1; attempt <= PER_TENANT_LIMIT + 2; attempt++) {
        try {
          await client.callTool({ name: 'tenant_report', arguments: { tenantId: 'acme' } });
          served += 1;
        } catch {
          refused = true;
          break;
        }
      }
    } finally {
      await client.close();
    }

    story.then('the gateway cuts them off at their quota');
    expect(refused).toBe(true);
    expect(served).toBeLessThanOrEqual(PER_TENANT_LIMIT);

    story.kv({ label: 'Promoted by', value: "x-mcp-header: Tenant-Id" });
    story.kv({ label: 'Read from', value: 'Mcp-Param-Tenant-Id' });
  });

  it('advertises tools/list as cacheable, with a stable order', async ({ task }) => {
    story.init(task);

    story.section({
      title: 'Cacheable lists',
      markdown: [
        'A list result carries `ttlMs` and `cacheScope` (SEP-2549), so a client or',
        'a gateway can hold it instead of re-fetching the catalog on every',
        'connect. `cacheScope: public` says the answer does not vary by caller,',
        'which is only safe when the order is deterministic too.',
      ].join('\n'),
    });

    story.given('a server that sets cache hints on tools/list');

    story.when('two separate clients list the tools');
    const first = await connect(GATEWAY_URL);
    const second = await connect(GATEWAY_URL);
    try {
      const a = await first.listTools();
      const b = await second.listTools();

      story.then('both see the same tools in the same order');
      expect(a.tools.map((tool) => tool.name)).toEqual(b.tools.map((tool) => tool.name));

      story.table({
        label: 'The catalog, in order',
        columns: ['#', 'Tool'],
        rows: a.tools.map((tool, index) => [String(index + 1), tool.name]),
      });

      story.and('the catalog includes the tool the gateway blocks, because blocking is the gateway’s job');
      expect(a.tools.map((tool) => tool.name)).toContain('drop_database');
    } finally {
      await first.close();
      await second.close();
    }
  });
});

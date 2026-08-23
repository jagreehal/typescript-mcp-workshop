/**
 * 07 — Talking to a server from another era, as a story that proves itself.
 *
 * The module connects to `@playwright/mcp`, which is built on the v1 SDK and
 * speaks 2025-11-25. These stories cover both halves: negotiation against the
 * real third-party server, and the mirror of it — one factory serving both
 * eras from a server of our own.
 *
 * No browser is launched. Handshaking and listing tools is protocol work, and
 * `@playwright/mcp` only starts Chromium when a navigation tool runs.
 */
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { connect } from '../shared/connect';
import { serveHttp, type McpHttpServer } from '../shared/serve';
import { buildServer } from '../01-tools-only/server';

const PORT = 8384;
const URL_ = `http://127.0.0.1:${PORT}/mcp`;

describe('07 — meeting a server from another era', () => {
  let server: McpHttpServer;

  beforeAll(async () => {
    server = await serveHttp(buildServer, PORT);
  });
  afterAll(async () => {
    await server.close();
  });

  it('serves both eras from one definition of the tools', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'Why `mode: auto` exists',
      markdown: [
        'Not every server has moved. `@playwright/mcp` is on the v1 SDK, so it',
        'speaks 2025-11-25 and has never heard of `server/discover`. An `auto`',
        'client probes, gets no modern evidence back, and falls back to the plain',
        '`initialize` handshake.',
        '',
        'The mirror of that is `legacy: \'stateless\'` on the server: one factory,',
        'both eras, no second definition of the tools to drift.',
      ].join('\n'),
    });

    story.mermaid({
      title: 'One factory, two eras',
      code: [
        'flowchart LR',
        '  M[2026-07-28 client] -->|self-describing request| H[createMcpHandler]',
        '  L[2025 client] -->|initialize handshake| H',
        '  H --> F[one buildServer]',
      ].join('\n'),
    });

    story.given('a server that never mentions which era it prefers');

    story.when('a modern client and a legacy client each connect');
    const modern = await connect(URL_, { era: { pin: '2026-07-28' } });
    const legacy = await connect(URL_, { era: 'legacy' });

    try {
      story.then('each negotiates its own era');
      expect(modern.getProtocolEra()).toBe('modern');
      expect(legacy.getProtocolEra()).toBe('legacy');

      story.and('both see the same tools, because there is only one definition');
      const modernListing = await modern.listTools();
      const legacyListing = await legacy.listTools();
      const modernTools = modernListing.tools.map((t) => t.name).sort();
      const legacyTools = legacyListing.tools.map((t) => t.name).sort();
      expect(modernTools).toEqual(legacyTools);

      story.table({
        label: 'Same server, two eras',
        columns: ['Client', 'Negotiated era', 'Tools seen'],
        rows: [
          ['pinned 2026-07-28', modern.getProtocolEra() ?? 'unknown', String(modernTools.length)],
          ['pinned legacy', legacy.getProtocolEra() ?? 'unknown', String(legacyTools.length)],
        ],
      });
    } finally {
      await modern.close();
      await legacy.close();
    }
  });

  it('falls back to 2025 against a real v1 server, without being told to', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'The third-party half',
      markdown: [
        '`@playwright/mcp` is built on the v1 SDK. It speaks 2025-11-25, has never',
        'heard of `server/discover`, and is not going to change because we would',
        'like it to.',
        '',
        'An `auto` client probes for modern evidence, gets none, and falls back to',
        'the plain `initialize` handshake — byte-identical to what a 2025 client',
        'would have sent. No configuration, no flag, no knowledge of who it is',
        'talking to.',
        '',
        'Nothing launches a browser here: handshaking and listing tools is protocol',
        'work, and Chromium only starts when a navigation tool runs.',
      ].join('\n'),
    });

    story.given('the real @playwright/mcp, spawned over stdio');
    const client = new Client(
      { name: 'negotiation-story', version: '2.0.0' },
      { versionNegotiation: { mode: 'auto' } },
    );
    await client.connect(
      new StdioClientTransport({
        // The binary pnpm linked for the devDependency, so the story does not
        // reach the network to fetch a server mid-test.
        command: resolve(process.cwd(), 'node_modules/.bin/playwright-mcp'),
        args: ['--headless'],
      }),
    );

    try {
      story.when('a 2026-07-28 client connects with mode auto');
      const era = client.getProtocolEra();

      story.then('it settles on the legacy lane, because that is all the server has');
      expect(era).toBe('legacy');

      story.and('the catalog reads normally over the older protocol');
      const tools = await client.listTools();
      expect(tools.tools.length).toBeGreaterThan(0);

      story.table({
        label: 'Talking to a server from 2025',
        columns: ['Property', 'Value'],
        rows: [
          ['Server', '@playwright/mcp (v1 SDK)'],
          ['Negotiated era', String(era)],
          ['Tools listed', String(tools.tools.length)],
          ['Browsers launched', '0'],
        ],
      });
    } finally {
      await client.close();
    }
  }, 60_000);

  it('picks the modern lane when the server offers it', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'auto is not a downgrade',
      markdown: [
        '`auto` probes for modern evidence and only falls back when it finds',
        'none. Against a server that does support 2026-07-28 it stays modern, so',
        'using `auto` everywhere costs nothing against an up-to-date peer.',
      ].join('\n'),
    });

    story.given('a server that does speak 2026-07-28');
    story.when('a client connects with mode auto');
    const auto = await connect(URL_, { era: 'auto' });
    try {
      story.then('it settles on the modern lane, not the fallback');
      expect(auto.getProtocolEra()).toBe('modern');
    } finally {
      await auto.close();
    }
  });
});

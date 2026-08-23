import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { isEntrypoint } from '../shared/entrypoint';
import { banner, serveHttp } from '../shared/serve';
import { SERVER_PORT } from './constants';

/**
 * Cacheable list results (SEP-2549).
 *
 * `tools/list`, `prompts/list`, `resources/list` and `resources/read` now carry
 * `ttlMs` and `cacheScope`, and the order is deterministic. Two things follow:
 *
 *  1. A client can hold the tool catalog instead of re-fetching it on every
 *     connect — which matters far more now that there is no session to amortise
 *     the cost over. Every connection used to pay for a full catalog fetch.
 *  2. Deterministic order keeps the client's UPSTREAM prompt cache stable. If
 *     tool definitions shuffle between reconnects, the serialised tool block at
 *     the head of the model prompt changes, and every provider-side prompt
 *     cache entry is invalidated. That is a real bill, paid in tokens.
 */
export function buildServer() {
  const server = new McpServer(
    { name: 'headers-and-cache', version: '2.0.0' },
    {
      capabilities: { tools: {} },
      cacheHints: {
        // This catalog is fixed at build time and identical for every caller.
        'tools/list': { ttlMs: 300_000, cacheScope: 'public' },
        'server/discover': { ttlMs: 300_000, cacheScope: 'public' },
      },
    },
  );

  server.registerTool(
    'search',
    {
      title: 'Search',
      description: 'Search the catalog',
      inputSchema: z.object({ query: z.string() }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ query }) => ({
      content: [{ type: 'text', text: `results for "${query}": alpha, beta, gamma` }],
    }),
  );

  server.registerTool(
    'expensive_report',
    {
      title: 'Expensive report',
      description: 'A slow, costly report — the one worth rate limiting',
      inputSchema: z.object({ month: z.string() }),
      annotations: { readOnlyHint: true },
    },
    async ({ month }) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return { content: [{ type: 'text', text: `report for ${month}: 42 pages` }] };
    },
  );

  /**
   * Custom parameter headers (SEP-2243).
   *
   * `Mcp-Method` and `Mcp-Name` are fixed. `x-mcp-header` lets a tool promote
   * one of its OWN arguments to a header as well: declare it on the property in
   * `inputSchema` and a conforming client mirrors the value into
   * `Mcp-Param-Tenant-Id` on every call. The gateway can then meter, route or
   * shard per tenant while staying a body-blind HTTP proxy.
   *
   * The mirroring is checked, not trusted: the server compares each declared
   * header against the body argument and answers `-32020 HeaderMismatch` if
   * they disagree, so a caller cannot get cheap-tenant routing while asking for
   * an expensive tenant's data.
   *
   * Only `string`, `integer` and `boolean` properties may be promoted, the
   * header name must be an RFC 9110 token, and the property must be statically
   * reachable — no `oneOf`, no `items`. An annotation anywhere else makes the
   * whole tool definition invalid.
   */
  server.registerTool(
    'tenant_report',
    {
      title: 'Tenant report',
      description: 'A per-tenant report — the tenant travels as a header too',
      inputSchema: z.object({
        tenantId: z
          .string()
          .describe('Which tenant to report on')
          .meta({ 'x-mcp-header': 'Tenant-Id' }),
        month: z.string(),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ tenantId, month }) => ({
      content: [{ type: 'text', text: `${tenantId} used 1,204 credits in ${month}` }],
    }),
  );

  server.registerTool(
    'drop_database',
    {
      title: 'Drop database',
      description: 'Exists only to be blocked at the gateway by name',
      inputSchema: z.object({ name: z.string() }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ name }) => ({
      content: [{ type: 'text', text: `if you are reading this, the gateway failed to block ${name}` }],
    }),
  );

  return server;
}

if (isEntrypoint(import.meta.url)) {
  await serveHttp(buildServer, SERVER_PORT);
  banner('🏷️  Headers & cache MCP server', SERVER_PORT, [
    'tools     search, expensive_report, tenant_report, drop_database',
    'cache     tools/list — ttlMs=300000 scope=public',
    'headers   tenant_report.tenantId is mirrored to Mcp-Param-Tenant-Id',
  ]);
}

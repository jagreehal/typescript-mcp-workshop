import { McpServer, ResourceTemplate } from '@modelcontextprotocol/server';
import { isEntrypoint } from '../shared/entrypoint';
import { banner, serveHttp } from '../shared/serve';
import { MIME_TYPES, PORT, RESOURCE_NAMES, RESOURCE_URIS, SERVER_CONFIG } from './constants';

/**
 * Resources: read-only data, addressed by URI.
 *
 * New on 2026-07-28: `resources/read` and the list verbs carry cache fields
 * (`ttlMs`, `cacheScope` — SEP-2549). A resource regenerated on every read says
 * `ttlMs: 0`; a document that changes daily says so and stops being re-fetched
 * on every reconnect. Set them per resource with `cacheHint`, or per operation
 * with the server's `cacheHints` option.
 */
export function buildServer() {
  const server = new McpServer(
    { name: SERVER_CONFIG.NAME, version: SERVER_CONFIG.VERSION },
    {
      capabilities: { resources: {} },
      // The default for cacheable results is `ttlMs: 0, cacheScope: 'private'`
      // — "do not cache". This catalog is fixed at build time, so clients may
      // safely hold it for a minute.
      cacheHints: {
        'resources/list': { ttlMs: 60_000, cacheScope: 'public' },
      },
    },
  );

  server.registerResource(
    RESOURCE_NAMES.APP_LOGS,
    RESOURCE_URIS.APP_LOGS,
    {
      description: 'Current application log entries',
      mimeType: MIME_TYPES.PLAIN_TEXT,
      cacheHint: { ttlMs: 0, cacheScope: 'private' },
    },
    async (uri) => {
      const timestamp = new Date().toISOString();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: MIME_TYPES.PLAIN_TEXT,
            text: [
              `${timestamp} [INFO] Application started successfully`,
              `${timestamp} [INFO] MCP resources server initialized`,
              `${timestamp} [DEBUG] Static resource access: app.log`,
              `${timestamp} [INFO] Ready to serve resource requests`,
            ].join('\n'),
          },
        ],
      };
    },
  );

  server.registerResource(
    RESOURCE_NAMES.SYSTEM_STATUS,
    RESOURCE_URIS.SYSTEM_STATUS,
    {
      description: 'Live system status and metrics',
      mimeType: MIME_TYPES.JSON,
      cacheHint: { ttlMs: 0, cacheScope: 'private' },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: MIME_TYPES.JSON,
          text: JSON.stringify(
            {
              timestamp: new Date().toISOString(),
              uptimeSeconds: Math.round(process.uptime()),
              memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
              platform: process.platform,
              nodeVersion: process.version,
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerResource(
    RESOURCE_NAMES.RESOURCES_GUIDE,
    RESOURCE_URIS.RESOURCES_GUIDE,
    {
      description: 'Guide to MCP resource patterns',
      mimeType: MIME_TYPES.MARKDOWN,
      // Static prose: public and long-lived. This is what cache hints are for.
      cacheHint: { ttlMs: 3_600_000, cacheScope: 'public' },
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: MIME_TYPES.MARKDOWN, text: RESOURCES_GUIDE }],
    }),
  );

  // Binary content travels base64-encoded in `blob`, not in `text`.
  server.registerResource(
    RESOURCE_NAMES.MCP_LOGO,
    RESOURCE_URIS.MCP_LOGO,
    {
      description: 'A 1x1 PNG, to show how binary resources travel',
      mimeType: MIME_TYPES.PNG,
      cacheHint: { ttlMs: 3_600_000, cacheScope: 'public' },
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: MIME_TYPES.PNG, blob: ONE_PIXEL_PNG }],
    }),
  );

  // A URI template: one registration, an unbounded family of resources.
  // `{team}` is filled in by the caller; `list` keeps the concrete URIs
  // discoverable through `resources/list`.
  server.registerResource(
    RESOURCE_NAMES.TEAM_METRICS,
    new ResourceTemplate('data://metrics/{team}.csv', {
      list: async () => ({
        resources: TEAMS.map((team) => ({
          uri: `data://metrics/${team}.csv`,
          name: `${team} metrics`,
          mimeType: MIME_TYPES.CSV,
        })),
      }),
    }),
    {
      description: 'Per-team performance metrics as CSV',
      mimeType: MIME_TYPES.CSV,
      cacheHint: { ttlMs: 30_000, cacheScope: 'public' },
    },
    async (uri, variables) => {
      const team = String(variables.team);
      if (!TEAMS.includes(team)) throw new Error(`Unknown team: ${team}`);
      return {
        contents: [{ uri: uri.href, mimeType: MIME_TYPES.CSV, text: metricsCsv(team) }],
      };
    },
  );

  server.registerResource(
    RESOURCE_NAMES.VOLATILE_RESOURCE,
    RESOURCE_URIS.VOLATILE_RESOURCE,
    {
      description: 'Fails ~30% of the time, to show read errors',
      mimeType: MIME_TYPES.PLAIN_TEXT,
      cacheHint: { ttlMs: 0, cacheScope: 'private' },
    },
    async (uri) => {
      if (Math.random() < 0.3) throw new Error('Resource temporarily unavailable');
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: MIME_TYPES.PLAIN_TEXT,
            text: `OK at ${new Date().toISOString()}`,
          },
        ],
      };
    },
  );

  /**
   * Pagination: not from here.
   *
   * `McpServer` answers `resources/list` with every registered resource in
   * one page, and it offers no hook to change that — `registerResource` takes
   * no page size, and a template's `list` callback receives only `ctx`, never
   * a cursor.
   *
   * The low-level escape hatch does not reach it either:
   *
   *   server.server.setRequestHandler('resources/list', …)   // registers, never runs
   *
   * That call is accepted and the handler is never invoked, because
   * `McpServer` owns the methods it registered. The same thing happens to
   * `tasks/get` in module 14. A server that must paginate builds on the
   * low-level `Server` class instead of `McpServer`, and assembles its own
   * list. See this module's README.
   */

  return server;
}

const TEAMS = ['platform', 'payments', 'growth'];

function metricsCsv(team: string): string {
  const rows = Array.from({ length: 5 }, (_unused, index) => {
    const timestamp = new Date(Date.now() - (5 - index) * 60_000).toISOString();
    return `${timestamp},${100 + index * 7},${50 + index * 13},${(index * 0.4).toFixed(2)}`;
  });
  return [`# ${team}`, 'timestamp,requests,response_time_ms,error_rate', ...rows].join('\n');
}

const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const RESOURCES_GUIDE = `# MCP Resources

Resources are **read-only** data a server exposes, addressed by URI.

## URI schemes

Any scheme you like, as long as it is consistent: \`file:///\`, \`system://\`,
\`docs://\`, \`data://\`. The scheme is a naming convention, not a transport.

## Templates

\`data://metrics/{team}.csv\` is one registration covering every team. Supply a
\`list\` callback so the concrete URIs still appear in \`resources/list\`.

## Cache fields (2026-07-28)

\`resources/read\` and the list verbs carry \`ttlMs\` and \`cacheScope\`:

- \`ttlMs: 0\` — do not cache. The default.
- \`cacheScope: 'private'\` — per client. Anything derived from the caller's identity.
- \`cacheScope: 'public'\` — shareable. Only for content that does not vary by caller.

Getting this right is what keeps a client's upstream prompt cache stable across
reconnects: the catalog stops changing shape on every connect.
`;

if (isEntrypoint(import.meta.url)) {
  await serveHttp(buildServer, PORT);
  banner('🗂️  Resources MCP server', PORT, [
    'resources logs, status, guide, logo (binary), metrics template, volatile',
    'note      each resource carries its own ttlMs / cacheScope',
  ]);
}

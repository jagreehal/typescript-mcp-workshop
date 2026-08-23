import { readFile } from 'node:fs/promises';
import { CLIENT_CAPABILITIES_META_KEY, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { isEntrypoint } from '../shared/entrypoint';
import { banner, serveHttp } from '../shared/serve';
import { PORT, UI_EXTENSION_ID, UI_MIME_TYPE, VIEW_URI } from './constants';

/**
 * MCP Apps (SEP-1865): a tool that comes with a user interface.
 *
 * Two registrations, tied together by a URI:
 *
 *   1. a RESOURCE at `ui://…` whose body is an HTML page, and
 *   2. a TOOL carrying `_meta.ui.resourceUri` pointing at it.
 *
 * When a host that supports the extension calls the tool, it reads the
 * resource, renders it in a sandboxed iframe, and proxies JSON-RPC between
 * that iframe (the "View") and this server. The View is an MCP client, the
 * host is the proxy, and this file stays an ordinary MCP server.
 *
 * Nothing here imports `@modelcontextprotocol/ext-apps`. The extension is
 * `_meta` on registrations the SDK already supports, so the v2 packages carry
 * it with no help.
 */

const VIEW_PATH = new URL('view.html', import.meta.url);

const SALES = [
  { region: 'North', revenue: 128_400 },
  { region: 'South', revenue: 94_100 },
  { region: 'East', revenue: 156_800 },
  { region: 'West', revenue: 71_300 },
];

/** Moves on each refresh, so the View has something to re-fetch. */
let quarter = 1;

export function buildServer() {
  const server = new McpServer(
    { name: 'sales-apps-demo', version: '2.0.0' },
    {
      capabilities: {
        tools: {},
        resources: {},
        // Extensions are negotiated, not assumed (SEP-2133). A client reads
        // this from `server/discover`; module 14 does the same for tasks.
        extensions: { [UI_EXTENSION_ID]: { mimeTypes: [UI_MIME_TYPE] } },
      },
    },
  );

  server.registerTool(
    'show_sales',
    {
      title: 'Show sales',
      description: 'Revenue by region for the current quarter',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
      // The whole of the tool half of MCP Apps.
      _meta: {
        ui: {
          resourceUri: VIEW_URI,
          // The default. Spelled out here so the contrast with
          // `refresh_sales` below is visible.
          visibility: ['model', 'app'],
        },
      },
    },
    async (_arguments, ctx) => {
      const total = SALES.reduce((sum, row) => sum + row.revenue, 0);

      // Progressive enhancement, checked at CALL time. The v2 factory
      // receives era and authInfo but not the client's capabilities, so a
      // server cannot register a different tool per host the way the MCP
      // Apps spec suggests. The envelope on the request carries them, so the
      // decision moves into the handler.
      const hostSupportsUi = supportsUi(ctx.mcpReq.envelope);
      console.log(`   show_sales — host UI support: ${hostSupportsUi ? 'yes' : 'no, text only'}`);

      // A UI-enabled tool MUST still return meaningful content. The model
      // reads this; the View reads `structuredContent`. Same call, two
      // audiences, and the UI never becomes a requirement.
      return {
        content: [
          {
            type: 'text',
            text: `Q${quarter} revenue £${total.toLocaleString('en-GB')} across ${SALES.length} regions.`,
          },
        ],
        structuredContent: { quarter, total, rows: SALES },
      };
    },
  );

  server.registerTool(
    'refresh_sales',
    {
      title: 'Refresh sales',
      description: 'Advance to the next quarter',
      inputSchema: z.object({}),
      _meta: {
        // App-only. The View's refresh button calls this; the model never
        // sees it, so a button does not cost tokens in every prompt. A host
        // that honours visibility filters it out of `tools/list` for the
        // model — the filtering is the host's job, not this server's.
        ui: { resourceUri: VIEW_URI, visibility: ['app'] },
      },
    },
    async () => {
      quarter = (quarter % 4) + 1;
      for (const row of SALES) {
        row.revenue = Math.round(row.revenue * (0.85 + Math.random() * 0.3));
      }
      const total = SALES.reduce((sum, row) => sum + row.revenue, 0);
      return {
        content: [{ type: 'text', text: `now Q${quarter}` }],
        structuredContent: { quarter, total, rows: SALES },
      };
    },
  );

  server.registerResource(
    'sales-dashboard',
    VIEW_URI,
    {
      title: 'Sales dashboard',
      description: 'The View rendered for show_sales',
      mimeType: UI_MIME_TYPE,
      // Templates are static, so a host can fetch and review them at connect
      // time rather than on every call. That review window is the point of
      // declaring the resource up front.
      cacheHint: { ttlMs: 3_600_000, cacheScope: 'public' },
    },
    async () => ({
      contents: [
        {
          uri: VIEW_URI,
          mimeType: UI_MIME_TYPE,
          text: await readFile(VIEW_PATH, 'utf8'),
          // Restrictive by default: the host builds the iframe CSP from this,
          // and declaring nothing means the View reaches nothing. This one
          // talks to no external service, so both lists stay empty.
          _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] } } },
        },
      ],
    }),
  );

  return server;
}

/**
 * Did the caller declare the UI extension?
 *
 * On 2026-07-28 capabilities ride the per-request `_meta` envelope, because
 * there is no `initialize` to declare them once. The published MCP Apps spec
 * still shows the handshake; this is the same negotiation on this revision.
 */
function supportsUi(envelope: { [key: string]: unknown } | undefined): boolean {
  const capabilities = envelope?.[CLIENT_CAPABILITIES_META_KEY] as
    | { extensions?: Record<string, { mimeTypes?: string[] }> }
    | undefined;
  const ui = capabilities?.extensions?.[UI_EXTENSION_ID];
  return ui?.mimeTypes?.includes(UI_MIME_TYPE) ?? false;
}

if (isEntrypoint(import.meta.url)) {
  await serveHttp(buildServer, PORT);
  banner('🖼️  MCP Apps server', PORT, [
    'tools     show_sales (model + app), refresh_sales (app only)',
    `resource  ${VIEW_URI}`,
    'note      the tool works with no UI at all — the View is an enhancement',
  ]);
}

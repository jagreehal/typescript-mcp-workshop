import { McpServer } from '@modelcontextprotocol/server';
import { instrumentMcpServer } from 'autotel-mcp-instrumentation/server';
import { z } from 'zod';
import { initTelemetry, TELEMETRY_CONFIG } from '../shared/otel';
import { isEntrypoint } from '../shared/entrypoint';
import { banner, serveHttp } from '../shared/serve';
import { PORT } from './constants';

/**
 * Tracing an MCP server with OpenTelemetry.
 *
 * Telemetry must be initialised before anything you want traced is
 * constructed — that is an OpenTelemetry rule, not an MCP one.
 */
initTelemetry('workshop-mcp-server');

/**
 * `instrumentMcpServer` returns a Proxy around the server: it intercepts
 * `registerTool` and wraps each handler in a span, reading the parent trace
 * context out of the request's `_meta`.
 *
 * Why this still works on 2026-07-28, unchanged: the propagation was always in
 * `_meta`, never in the session or the transport. This revision made `_meta`
 * the mandatory per-request envelope, so there is now *always* somewhere for a
 * `traceparent` to ride — and no session for a trace to get orphaned from.
 * Stateless made distributed tracing easier, not harder.
 */
export function buildServer() {
  const server = new McpServer(
    { name: 'observable-server', version: '2.0.0' },
    { capabilities: { tools: {} } },
  );

  const traced = instrumentMcpServer(server, TELEMETRY_CONFIG);

  traced.registerTool(
    'lookupOrder',
    {
      title: 'Look up an order',
      description: 'Fetch an order by ID',
      inputSchema: z.object({ orderId: z.string() }),
      annotations: { readOnlyHint: true },
    },
    async ({ orderId }: { orderId: string }) => {
      // Nested work gets nested spans automatically — the tool span is the
      // active context for anything it awaits.
      const order = await fakeDatabaseRead(orderId);
      return { content: [{ type: 'text', text: JSON.stringify(order) }] };
    },
  );

  traced.registerTool(
    'flakyTool',
    {
      title: 'Flaky tool',
      description: 'Fails roughly half the time, so you have error spans to look at',
      inputSchema: z.object({}),
    },
    async () => {
      if (Math.random() < 0.5) {
        // A tool-level error: recorded on the span AND returned to the model.
        return { isError: true, content: [{ type: 'text', text: 'upstream timed out' }] };
      }
      return { content: [{ type: 'text', text: 'ok' }] };
    },
  );

  traced.registerTool(
    'slowTool',
    {
      title: 'Slow tool',
      description: 'Takes about a second — the one you want a latency histogram for',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { content: [{ type: 'text', text: 'finally done' }] };
    },
  );

  return traced;
}

async function fakeDatabaseRead(orderId: string): Promise<Record<string, unknown>> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  return { orderId, status: 'shipped', total: 42.5 };
}

if (isEntrypoint(import.meta.url)) {
  await serveHttp(buildServer, PORT);
  banner('📡 Observable MCP server', PORT, [
    'tracing   autotel-mcp-instrumentation, W3C trace context via _meta',
    `collector ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'} (optional)`,
    'tools     lookupOrder, flakyTool, slowTool',
  ]);
}

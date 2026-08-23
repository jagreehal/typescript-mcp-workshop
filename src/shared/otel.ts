import { init } from 'autotel';

/**
 * OpenTelemetry for MCP.
 *
 * `autotel-mcp-instrumentation` wraps a server or client in a Proxy and traces
 * every `registerTool` handler / `callTool`, propagating W3C trace context
 * through MCP's `_meta` field. That propagation is why it survived the move to
 * 2026-07-28 unchanged: `_meta` is now the *per-request envelope* the spec
 * mandates on every request, so there is always somewhere to put a
 * `traceparent`, with no session to hang it off.
 *
 * Call this before constructing a server or client. With no collector running
 * the SDK just buffers and drops — the examples still work.
 */
export function initTelemetry(service: string): void {
  init({
    service,
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318',
  });
}

export const TELEMETRY_CONFIG = {
  captureArgs: true,
  // Results can carry anything the tool read. Off by default; turn it on
  // deliberately, per server, when you know what flows through it.
  captureResults: false,
} as const;

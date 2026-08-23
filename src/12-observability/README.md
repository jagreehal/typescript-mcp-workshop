# 12. Observability

Distributed tracing across the MCP boundary with OpenTelemetry, propagating
W3C trace context through `_meta` ([SEP-414](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/414)).

## You leave able to

- Wrap server and client with `instrumentMcpServer` / `instrumentMcpClient`
- See child spans from tool handlers under one trace id
- Decide when to turn on `captureResults`

## Run

```bash
pnpm example:12
```

Optional collector UI:

```bash
pnpm dlx autotel-devtools
```

OTLP on `:4318`, UI on the same port: <http://localhost:4318>. No Docker.

Without a collector the SDK buffers and drops. The module still runs.

No model key required.

## Concepts

**Two lines of instrumentation.** `instrumentMcpServer` and
`instrumentMcpClient` return a Proxy that intercepts `registerTool` and
`callTool`, wraps each in a span, and propagates W3C trace context through
MCP's `_meta` field. The tool handler becomes the active context, so anything
it awaits picks up nested spans on its own.

**The revision left propagation alone.** Trace fields lived in `_meta` from the
start, outside the session and outside the transport. 2026-07-28 made `_meta` a
mandatory per-request envelope, so a `traceparent` has somewhere to ride on
each request and no session exists to orphan a trace from. Going stateless made
distributed tracing easier.

**Order matters.** Call `initTelemetry()` before you construct anything you want
traced. OpenTelemetry imposes that, not MCP.

**`captureResults` starts off.** Arguments are often safe to record. Results
carry whatever the tool read. Turn it on per server once you know what flows
through.

## Compatibility note

`autotel-mcp-instrumentation` peers on the v1 monolith
(`@modelcontextprotocol/sdk`). It duck-types `registerTool` and `callTool`,
which the v2 packages keep with compatible shapes, so it works against v2.
`pnpm-workspace.yaml` silences the missing-peer warning. Running this module
against a local OTLP collector produces real trace batches.

## Try this

1. Start autotel-devtools, run the module, open the UI, find the client→server
   trace.
2. Confirm the tool span is a child of the client span (same trace id).
3. Enable `captureResults` on the server instrumentation and inspect one span
   attribute payload. Decide whether you would ship that in production.

## Ops angle

Pair traces with an audit log recording tool name, principal, and outcome.
Traces tell you what happened; the audit log is what you still hold after
sampling has thrown most of the evidence away. Module 11's gateway can emit
metrics on `Mcp-Method` and `Mcp-Name` without opening the body; this module
shows the in-process half.

**Name spans for the thing, not the call.** `tools/call refund_order` groups
usefully; `handleRequest` does not. Put the tool name in the span name and the
arguments in attributes, and your trace search becomes "show me every slow
`refund_order`" rather than "show me every MCP request".

**Traces answer "why was this one slow". Metrics answer "how often".** You want
both, and the cheap set is small: call count and error rate by tool name, and a
duration histogram by tool name. Deriving those from spans works until you
sample, and then it silently stops being true.

**What to alert on**, in rough order of how often it earns its page:

| Signal | Why it matters |
|---|---|
| Error rate by tool | A tool returning `isError` for every call looks healthy at the HTTP layer |
| p99 duration by tool | The tool that blocks is the one that makes a client give up |
| `-32602` volume | A client is sending a bad `_meta` envelope, or a schema changed under someone |
| `HeaderMismatch` volume | Tampering, or a buggy client ([11](../11-headers-and-cache)) |
| 401 and 403 rate | Step-up flows that never converge ([09](../09-oauth-authentication)) |
| Tasks stuck in `working` | A handle nobody will ever finish ([14](../14-tasks)) |

**Sample the traces, count everything.** Head sampling at 1 to 10 per cent
keeps the bill sane. Keep the metrics unsampled, because that is the part you
alert on.

**Results carry whatever the tool read.** `captureResults` is off by default
for that reason: a tool that reads a customer record puts the customer record
in your tracing backend, which is usually a different security boundary from
your database, with different retention and a different access list. Turn it on
per server, once you know what flows through. Arguments are usually safer, but
"usually" is doing real work in that sentence.

## Related

Shared setup: [`../shared/otel.ts`](../shared/otel.ts). Header-level metering:
[11](../11-headers-and-cache).

## Files

- [`server.ts`](server.ts): instrumented tools
- [`client.ts`](client.ts): instrumented calls
- [`constants.ts`](constants.ts)

<!-- nav -->

---

Reference: [specification](https://modelcontextprotocol.io/specification/2026-07-28) ·
[schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) ·
[migration](../../docs/migration.md) ·
[threats](../../docs/security.md) ·
[SDK notes](../../docs/sdk-notes.md)

[← 11, Header routing and cacheable lists](../11-headers-and-cache) · [13, Subscriptions →](../13-subscriptions)

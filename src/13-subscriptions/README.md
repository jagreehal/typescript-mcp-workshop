# 13. Subscriptions

The one stream 2026-07-28 kept, and the only way a server pushes change events
now (`subscriptions/listen`, [SEP-2575](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2575)).

## You leave able to

- Open a client-driven listen POST with an explicit notification filter
- Read `notifications/subscriptions/acknowledged` as the supported subset
- Publish via `handler.notify.*` (process-level), not a per-request `McpServer`

## Run

```bash
pnpm example:13
```

No model key required.

## Removed in this revision

2025 gave a server two push channels:

- the transport's **HTTP GET endpoint**, an SSE stream held open for the life of
  the session, carrying whatever the server chose to send
- **`resources/subscribe`** / `resources/unsubscribe`, per-URI opt-in whose
  registrations lived in that same session

Both are removed ([SEP-2575](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2575)). Both were session state. Both let a server speak
first, which is how a user ends up prompted by a tool they never invoked.

## Replacement

One long-lived POST, opened by the client, whose response body is the stream:

```jsonc
{
  "method": "subscriptions/listen",
  "params": {
    "notifications": {
      "toolsListChanged": true,
      "resourceSubscriptions": ["build://status"]
    }
  }
}
```

The server answers with `notifications/subscriptions/acknowledged` naming the
subset of that filter it will honour, and sends nothing outside it. This demo
asks for `promptsListChanged` from a server with no prompts capability, so you
can watch it drop out of the acknowledgement (no event, no error).

Every notification on the stream is stamped with
`io.modelcontextprotocol/subscriptionId`, so a client running several streams
can tell them apart.

This is still a stateless protocol. Nothing about the stream affects any other
request. Those keep landing on any instance. Only this one POST is pinned to the
instance serving it. Losing it costs a re-listen.

## Still request-scoped

`notifications/progress` and `notifications/message` are **request-scoped**.
They flow on the response stream of the request they belong to, as before.
`subscriptions/listen` carries change events only.

The demo shows both kinds side by side so the distinction is not just a claim.
`collect_logs` reports progress and honours cancellation, and neither touches
the subscription. Run it with no stream open and both still work.

**Progress is opt-in, per call.** The client passes `onprogress`, which makes
the SDK attach a `progressToken` to the request `_meta`. The server reads it
and sends nothing when it is absent:

```ts
const progressToken = ctx.mcpReq._meta?.progressToken;
if (progressToken !== undefined) {
  await ctx.mcpReq.notify({
    method: 'notifications/progress',
    params: { progressToken, progress: line, total: lines, message: `line ${line}` },
  });
}
```

`ctx.mcpReq.notify` is the request-scoped notifier, and it is a different thing
from `handler.notify` above. One belongs to a call, the other to the process.

**Cancellation is an `AbortSignal`, and it is cooperative.** The client passes
a `signal`; aborting raises locally and sends `notifications/cancelled`. On the
server that surfaces as `ctx.mcpReq.signal.aborted`, and nothing checks it for
you:

```ts
if (ctx.mcpReq.signal.aborted) throw new Error('cancelled by client');
```

Check it at each step you can safely stop at. A server acknowledges a cancel
but is never obliged to abandon work already in flight, which is the same rule
[module 14](../14-tasks) applies to `tasks/cancel`.

**A long call needs a timeout budget.** The client's default request timeout
applies to progress-reporting calls too. Pass `resetTimeoutOnProgress: true` to
let each notification push the deadline out, and `maxTotalTimeout` to keep a
ceiling on the whole thing, or a stalled server holds your call open forever.

## Publishing from the server

```ts
const mcp = await serveHttp(buildServer, PORT);
mcp.handler.notify.resourceUpdated('build://status');
mcp.handler.notify.toolsChanged();
```

`notify` hangs off the **handler**, not a per-request `McpServer`. Change events
are a property of the process. The factory instance that served `tools/call` is
closed before the next request arrives.

### The bus is the fleet seam

`createMcpHandler` creates an `InMemoryServerEventBus` when you supply none,
and in-process is where most people stop. Across a fleet that is wrong in a way
nothing reports: each instance publishes to its own listeners, so a client
whose listen POST landed on instance #2 never hears what instance #1 raised.
No error, no warning, just events that quietly do not arrive.

So this server passes one explicitly, and the interface it implements is two
methods:

```ts
const bus: ServerEventBus = {
  publish(event) { /* Redis: PUBLISH mcp:events JSON.stringify(event) */ },
  subscribe(listener) { /* Redis: SUBSCRIBE, call listener per message */
                        /* return an unsubscribe that is safe to call twice */ },
};

const mcp = await serveHttp(buildServer, PORT, { bus });
```

That is the whole swap. The SDK keeps the wire semantics — ack first,
filtering, subscription ids — and the bus only moves events between instances.

Run the module and watch the server log: every `handler.notify.*` call appears
as a `bus publish`, including `build://log`, which no client asked for.
Publishing and delivering are separate steps, and the filter runs downstream of
the bus.

## Subscriptions and cache hints are complements

`ttlMs` bounds how stale a client that is not listening can be. A subscription
tells one that is. This server sets a 5-second TTL on `tools/list` and also
emits `toolsListChanged`: the polling client stays within five seconds; the
listening client learns on the next event.

## Also removed in this revision

`ping` and `logging/setLevel` are gone. Log level is per-request now, via
`io.modelcontextprotocol/logLevel` in `_meta`. A server MUST NOT emit
`notifications/message` for a request that did not carry it. Logging itself is
deprecated ([SEP-2577](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577)) in favour of stderr or OpenTelemetry; see
[module 12](../12-observability).

## Try this

1. Open the listen stream. Confirm the ack omits `promptsListChanged`.
2. Advance the build until `deploy` appears. Confirm `toolsListChanged` and a
   resource update on `build://status`.
3. Kill the client, reconnect with the same filter, and confirm a fresh ack
   (no session resume).

## If it breaks

| Symptom | Likely cause |
|---|---|
| Filter flag never fires | Capability not advertised; check the ack subset |
| Updates only on one instance | In-memory bus; need a shared `ServerEventBus` |
| Progress missing on the listen stream | Progress is request-scoped; look at the tool call response |
| No progress at all | The client did not pass `onprogress`, so there is no `progressToken` |
| The call times out mid-progress | Add `resetTimeoutOnProgress: true`, and a `maxTotalTimeout` ceiling |
| Cancel does not stop the work | Nothing checks `ctx.mcpReq.signal.aborted` in the loop |
| The stream drops and events stop | Losing it costs a re-listen; reconnect with the same filter and expect a fresh ack |

## Related

Cacheable lists: [11](../11-headers-and-cache). Resource cache hints: [02](../02-resources).

## Files

- [`server.ts`](server.ts): build stages, notify, cache hints
- [`client.ts`](client.ts): listen + drive the build
- [`constants.ts`](constants.ts)

<!-- nav -->

---

Reference: [specification](https://modelcontextprotocol.io/specification/2026-07-28) ·
[schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) ·
[migration](../../docs/migration.md) ·
[threats](../../docs/security.md) ·
[SDK notes](../../docs/sdk-notes.md)

[← 12, Observability](../12-observability) · [14, Tasks →](../14-tasks)

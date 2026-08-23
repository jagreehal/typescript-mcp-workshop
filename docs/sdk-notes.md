# SDK v2 notes

Where the TypeScript SDK does something other than what the specification, the
docs, or plain intuition would lead you to expect.

Everything here was checked by running it against
`@modelcontextprotocol/server` and `/client` v2.0.0. Each entry says how, so
you can re-check when a version bumps and delete the row when it stops being
true.

## `McpServer` will not let you take over its methods

`setRequestHandler` on the underlying `Server` is accepted for a method
`McpServer` already owns, and the handler never runs:

```ts
server.server.setRequestHandler('resources/list', handler);  // registers, never fires
```

`McpServer` dispatches to the handlers it installed for the primitives you
registered. The low-level setter writes into a map that never gets consulted
for those methods, and you get no warning.

**Checked by**: a `console.log` as the first line of the handler in
[module 02](../src/02-resources), which never printed while the built-in served
all eight resources.

**Affects**: `resources/list` ([02](../src/02-resources)), `tasks/get`
([14](../src/14-tasks)), and by the same mechanism every other method
`McpServer` registers.

**Work around it** by building on the low-level `Server` class, which means
giving up `registerTool` / `registerResource` / `registerPrompt` and writing
the dispatch yourself. Worth it for a genuinely paginated catalogue, and
almost never otherwise.

## There is no pagination hook on `McpServer`

`registerResource` takes no page size. A `ResourceTemplate`'s `list` callback
is `(ctx) => ListResourcesResult`, with no cursor in and nothing that would let
you return a meaningful `nextCursor`. `resources/list`, `tools/list` and
`prompts/list` return everything, in one page, always.

The client half is complete: `listResources()` walks every page and aggregates,
`listResources({ cursor })` returns one raw page. So a v2 client talks to a
paginating server correctly today; a v2 `McpServer` cannot be one.

One sharp edge on the client side: `listResources({ cursor: undefined })` is
**not** the per-page path. The branch is on the cursor's value, not on whether
the key is present, so an undefined cursor takes the aggregating walk. Page one
has no cursor by definition, so a hand-rolled walk starts with
`client.request({ method: 'resources/list', params: {} })` and uses
`listResources({ cursor })` from page two.

**Checked by**: reading the exported types, failing to override the method per
the entry above, and watching a `{ cursor: undefined }` call return the full
aggregate in [module 02](../src/02-resources).

## The factory cannot see who is calling

```ts
type McpServerFactory = (ctx: McpRequestContext) => McpServer | Server | Promise<…>;

interface McpRequestContext {
  era: 'legacy' | 'modern';
  authInfo?: AuthInfo;
  requestInfo?: Request;
}
```

No client capabilities. Any pattern that registers different tools for
different callers — the progressive enhancement the MCP Apps spec describes, a
capability-gated extension, a per-tenant catalogue — has to move the decision
into the handler, where the envelope is readable:

```ts
const capabilities = ctx.mcpReq.envelope?.[CLIENT_CAPABILITIES_META_KEY];
```

**Checked by**: [module 15](../src/15-mcp-apps), which prints the capability it
saw on each call and answers a UI-capable client and a plain one from the same
registration.

## Argument validation is an `isError` result, not `-32602`

The SDK validates `inputSchema` before your handler runs and turns a failure
into a tool result:

```jsonc
{ "isError": true,
  "content": [{ "type": "text",
    "text": "Input validation error: Invalid arguments for tool refund_order: orderId: Too small…" }] }
```

This is the behaviour you want, because the model is told what was wrong and
can try again. It also means a client that inspects only rejections misses
every validation error, and it cuts across the "throw for malformed, return for
handled" line [module 01](../src/01-tools-only) draws.

**Checked by**: a test in [module 16](../src/16-testing) that pins it.

## The tasks extension ships types, no runtime

`@modelcontextprotocol/server` exports `Task`, `TaskStatus`, `GetTaskRequest`
and the rest for interoperability with 2025-11-25 peers, and offers no way to
serve them. `tasks/get` answers `-32601`. Returning
`{ resultType: 'task', … }` from a `tools/call` handler is rejected by the
result validator on the way out, and again on the client on the way in.

**Checked by**: [module 14](../src/14-tasks), which implements the same shape
with ordinary tools and says so.

## Things that fail silently

| What | What happens | Where |
|---|---|---|
| `.describe()` chained *after* `completable()` | Returns a fresh schema with no completable marker. No handler is registered and `completion/complete` answers `-32601` | [03](../src/03-prompts) |
| `ctx.mcpReq.requestState` read as a property | You get the function back, your state looks absent, and the handler loops the same question until the round limit trips | [10](../src/10-mrtr) |
| `acceptedContent` on a sampling response | Surfaces form-mode elicitation only. Use `inputResponse(responses, key)` for the discriminated view | [10](../src/10-mrtr) |
| A `console.log` in a stdio server | Corrupts the protocol stream on stdout. The client fails to parse and the cause is nowhere near the symptom | [04](../src/04-stdio-filesystem) |

## Deprecated calls that throw rather than warn

`ctx.mcpReq.elicitInput` and `ctx.mcpReq.requestSampling` are marked deprecated
under [SEP-2577](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577),
and on a 2026-07-28-era request they **throw**. They still work on the legacy
path, so a factory serving both eras keeps them for 2025 clients only. New code
returns `inputRequired(…)` instead ([module 10](../src/10-mrtr)).

`ctx.mcpReq.log` is deprecated too, and it keeps working for the deprecation
window.

## The client defaults to the old protocol

```ts
new Client(info)                                          // 2025 handshake
new Client(info, { versionNegotiation: { mode: 'auto' } }) // probe, then fall back
new Client(info, { versionNegotiation: { mode: { pin: '2026-07-28' } } })
```

`'legacy'` is the SDK's default: nothing puts a 2026-07-28 byte on the wire
unless you ask. [`shared/connect.ts`](../src/shared/connect.ts) defaults to
`'auto'` so the workshop's clients speak the current revision, which is not
what you get from a bare `new Client()`.

## Third-party packages still peer on v1

`autotel-mcp-instrumentation` ([12](../src/12-observability)) and
`@modelcontextprotocol/ext-apps` ([15](../src/15-mcp-apps)) both declare a peer
dependency on the v1 monolith `@modelcontextprotocol/sdk`. autotel duck-types
`registerTool` and `callTool`, which the v2 packages keep with compatible
shapes, so it works. ext-apps turns out to be unnecessary on the server side
entirely: `registerTool` and `registerResource` already accept the `_meta` the
extension needs.

Expect this to keep coming up while the ecosystem catches up. Check whether a
package needs the SDK's types or its runtime before assuming a version clash is
fatal.

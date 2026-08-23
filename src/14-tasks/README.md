# 14. Tasks

Long-running work without holding a connection open. The
`io.modelcontextprotocol/tasks` extension ([SEP-2663](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2663)) formalises the pattern;
this module ships the idiom with ordinary tools while the TypeScript SDK v2
lacks a tasks runtime.

## You leave able to

- Negotiate the tasks extension via `extensions` on capabilities / `_meta`
- Poll a durable job handle through to a terminal status
- Persist before answering, and treat cancel as cooperative

## Run

```bash
pnpm example:14
```

No model key required.

## The redesign

Tasks were experimental in the core protocol. 2026-07-28 moved them into an
official extension, `io.modelcontextprotocol/tasks` ([SEP-2663](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2663)), and redesigned
them:

- polling via **`tasks/get`** replaces the blocking `tasks/result`
- **`tasks/update`** carries client input when a task needs it mid-flight
- **`tasks/list`** is gone
- a server may return a task handle **unsolicited** (no per-request opt-in)

Negotiation rides on the `extensions` field this revision added to
capabilities. The client declares support in each request's `_meta`:

```jsonc
"_meta": {
  "io.modelcontextprotocol/clientCapabilities": {
    "extensions": { "io.modelcontextprotocol/tasks": {} }
  }
}
```

The server advertises the same key in capabilities from `server/discover`. A
server MUST NOT hand a task to a client that did not declare it.

Then a `tools/call` that would block answers with a handle instead:

```jsonc
{
  "resultType": "task",
  "task": {
    "taskId": "task_a1b2",
    "status": "working",
    "ttlMs": 300000,
    "pollIntervalMs": 400
  }
}
```

The client polls `tasks/get` until the status is terminal.

| Status | Terminal | Meaning |
|---|---|---|
| `working` | no | in progress |
| `input_required` | no | needs client input via `tasks/update` |
| `completed` | yes | `result` holds what the call would have returned |
| `failed` | yes | `error` holds the JSON-RPC error |
| `cancelled` | yes | cancellation was honoured |

`input_required` is the one row that needs a reply rather than another poll.
The client answers with `tasks/update`, keyed the same way MRTR keys its
`inputResponses` ([module 10](../10-mrtr)):

```jsonc
{
  "method": "tasks/update",
  "params": {
    "taskId": "task_a1b2",
    "inputResponses": { "confirm": { "action": "accept", "content": { "confirm": true } } }
  }
}
```

The status returns to `working` and polling resumes. That is the whole
difference between the two mechanisms: MRTR keeps the caller's original request
open across rounds, while a task hands back a handle and lets the caller go
away and come back.

A client that calls `tasks/get` without having declared the extension gets
`-32022 MissingRequiredClientCapability`, not a task
([module 11](../11-headers-and-cache) has the error table).

## This module's shape

**The TypeScript SDK v2.0.0 has no runtime for this extension.** It ships the
task wire *types* for interoperability with 2025-11-25 peers and stops there.
From `@modelcontextprotocol/server`:

> Task methods are 2025-11-25 wire vocabulary with no SDK runtime: the task
> wire types stay importable, but the typed method surface: `request()`,
> `setRequestHandler()`, `ctx.mcpReq.send()`: does not offer them.

Two consequences, both verifiable:

- `server.server.setRequestHandler('tasks/get', …)` registers nothing the
  dispatcher routes. A `tasks/get` request answers `-32601 Method not found`.
- Returning `{ resultType: 'task', … }` from a `tools/call` handler is rejected
  by the result validator on the server on the way out, and again on the client
  on the way in.

So [`server.ts`](server.ts) implements the same shape with ordinary tools:
`startRefund` in place of a `tools/call` that answers `resultType: "task"`,
`refund_status` in place of `tasks/get`, `cancel_refund` in place of
`tasks/cancel`. The status vocabulary is the extension's, unchanged.

A handle passed back as an ordinary tool argument is the same idiom
[module 08](../08-stateless-core) uses for carts. The extension formalises it.
Once the SDK carries the extension, the same server moves onto it by renaming
three tools into three methods.

## Reasons to use a handle

- **Intermediaries time out.** A held connection is a bet on every proxy
  between you and the client.
- **A handle survives a crash.** The client restarts and polls the same id.
  With a shared store, any instance answers.
- **Progress becomes visible.** `working` with a status message beats silence.
- **It stays stateless.** Each poll is an independent request, routable
  anywhere.

## Three details worth copying

**Persist before you answer.** The job is written to the store before the
response goes out. Reverse that and the first poll returns "unknown job" for
something you told it exists.

**Cancellation is cooperative.** `cancel_refund` records the intent. A job that
already reached a terminal state stays there. The spec says the same: a server
acknowledges a cancel but is not obliged to stop the work.

**The background worker re-reads before it writes.** `runInBackground` takes a
`jobId`, not a job, and every step does `get`, mutate, `set`:

```ts
const job = await jobs.get(jobId);
if (!job || job.status !== 'working') return;   // expired, or cancelled meanwhile
mutate(job);
await jobs.set(jobId, job);
```

The worker and the request handlers are separate readers of shared state. Hold
a reference from when the job started and you have a worker that overwrites a
cancellation it never saw, and that resurrects a job the store already expired.
Against a real store the captured object is stale by definition, so this is the
only shape that works anywhere.

The store itself is [`shared/store.ts`](../shared/store.ts), the same one
[module 08](../08-stateless-core) mints cart handles against, with `JOB_TTL_MS`
instead of a cart's lifetime. The module keeps no sweep of its own; expiry is
the store's job.

## Try this

1. Start a refund under the failure threshold. Poll until `completed`.
2. Start a refund over the threshold. Poll until `failed` with an error string.
3. Start a refund and cancel while `working`. Confirm a terminal `cancelled`
   (or that a late cancel leaves an already-completed job alone).

## Stretch (when the SDK grows a runtime)

Replace the three tools with `resultType: "task"` + `tasks/get` /
`tasks/cancel`. Keep the same job store and status vocabulary.

## Related

Explicit handles: [08](../08-stateless-core). Mid-call input without a task:
[10](../10-mrtr). Sibling extension still absent here: MCP Apps (host-rendered UI).

## Files

- [`server.ts`](server.ts): refund tools over a shared job store
- [`../shared/store.ts`](../shared/store.ts): the async, TTL'd store, shared with module 08
- [`client.ts`](client.ts): start, poll, cancel
- [`constants.ts`](constants.ts)

<!-- nav -->

---

Reference: [specification](https://modelcontextprotocol.io/specification/2026-07-28) ·
[schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) ·
[migration](../../docs/migration.md) ·
[threats](../../docs/security.md) ·
[SDK notes](../../docs/sdk-notes.md)

[← 13, Subscriptions](../13-subscriptions) · [15, MCP Apps →](../15-mcp-apps)

# 10. Multi Round-Trip Requests

A tool asks the user something mid-call with no stream left open to ask down.

## You leave able to

- Return `resultType: "input_required"` and resume via `inputResponses`
- Write a handler as a resumable state machine
- Integrity-protect `requestState` with `createRequestStateCodec`

## Run

```bash
pnpm example:10
```

## The problem it solves

Under 2025, a server needing a confirmation, a missing parameter, or a model
completion sent `elicitation/create` or `sampling/createMessage` down a
held-open bidirectional stream. That stream made the protocol stateful and kept
it off a load balancer.

MRTR ([SEP-2322](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2322)) turns the exchange around. The server returns
`resultType: "input_required"` naming what it wants. The client retries the
original call with the answers in `inputResponses`. No open stream, no session.
Each leg travels as an independent HTTP exchange that can land anywhere.

Callers see none of it. `callTool()` still returns a plain `CallToolResult`.
The extra rounds happen inside the call.

On the wire, the middle leg:

```jsonc
{
  "resultType": "input_required",          // note the underscore
  "inputRequests": {
    "confirm": { "type": "elicitation", "message": "Delete 3 files?", "schema": { … } }
  },
  "requestState": "eyJzdGVwIjoxfQ…"        // opaque, and back to you next round
}
```

The client answers with the same call plus `inputResponses` keyed by the same
identifiers, and `requestState` echoed back.

**The rounds are bounded.** The SDK's auto-fulfilment driver stops after a
fixed number, and `maxTotalTimeout` bounds the whole flow rather than each leg.
A handler that asks the same question every round burns the budget and fails,
which is the usual symptom of the `requestState` trap below.

**A server may only ask while it is answering.** Server-initiated requests are
allowed only during the processing of a client request
([SEP-2260](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2260)),
and this revision makes that a MUST rather than a recommendation. A user is
never prompted by a server they were not talking to.

**Form mode is not the only mode.** `ElicitRequestURLParams` asks the client to
send the user to a URL and report back, which is how a flow that needs a real
browser page (a payment, a consent screen) fits into a tool call. The enum
schema family (`TitledSingleSelectEnumSchema` and its four siblings) covers
pick-one and pick-many with labels a client can render.

### 2025 vs 2026 shape

| | 2025 | 2026-07-28 |
|---|---|---|
| How the server asks | Request down the open SSE/stream | `input_required` result on the POST |
| Where state lives | Session + open connection | `requestState` + `inputResponses` on retry |
| Load balancer | Sticky to the stream owner | Any instance can resume |

Sampling and roots are deprecated in this revision ([SEP-2577](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577)) with a
twelve-month window. New code should call model providers and pass paths as
tool arguments. They appear here because existing servers use them, and because
MRTR is how they work now.

## For your handlers

**Your handler runs more than once per logical call.** Write it as a resumable
state machine: check what you hold, ask for what you lack.

```ts
const confirmed = acceptedContent<{confirm: boolean}>(ctx.mcpReq.inputResponses, 'confirm');
if (!confirmed) return inputRequired({ inputRequests: { confirm: inputRequired.elicit({...}) } });
// ...only now do the work
```

## Two traps

**`requestState` is an accessor.** Call it: `ctx.mcpReq.requestState<T>()`. Read
it as a property and you get a function back. State looks absent. The handler
loops on the same question until the round limit trips.

**`acceptedContent` surfaces form-mode elicitation only.** A sampling result is
a different kind. Use `inputResponse(responses, key)`, which returns a
discriminated view over `missing`, `elicit`, `sampling`, and `roots`.

## Integrity-protecting `requestState`

`requestState` round-trips through the client and returns as
attacker-controlled input. The spec makes integrity protection a MUST wherever
it influences authorization, resource access, or business logic. The SDK
verifies nothing on its own.

`createRequestStateCodec` is the SDK's HMAC helper. `mint` seals. `verify` drops
into `ServerOptions.requestState.verify`. You get a TTL and a context binding
with it. Wire it up and the handler reads the verified payload through the typed
accessor without decoding twice.

```ts
const codec = createRequestStateCodec<CarriedState>({
  key: process.env.MCP_STATE_KEY,          // shared across all instances
  ttlSeconds: 300,
  bind: ctx => `${ctx.mcpReq.method}\0${ctx.http?.authInfo?.clientId ?? ''}`,
});
```

The `bind` stops one principal echoing state minted for another.

## Try this

1. Run and answer the elicitation. Confirm the tool completes after the retry.
2. Decline or send an empty confirmation if the demo allows. Confirm the
   handler asks again or exits with a clear failure.
3. Log `typeof ctx.mcpReq.requestState` once without calling it. Confirm it is
   a function.

## Related

Stateless routing: [08](../08-stateless-core). Long-running work with a durable
handle: [14](../14-tasks). Request-scoped progress still rides the call's own
response stream ([13](../13-subscriptions)).

## Files

- [`server.ts`](server.ts): MRTR handler + requestState codec
- [`client.ts`](client.ts): supplies elicitation answers
- [`constants.ts`](constants.ts)

<!-- nav -->

---

Reference: [specification](https://modelcontextprotocol.io/specification/2026-07-28) ·
[schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) ·
[migration](../../docs/migration.md) ·
[threats](../../docs/security.md) ·
[SDK notes](../../docs/sdk-notes.md)

[← 09, OAuth 2.1, hardened](../09-oauth-authentication) · [11, Header routing and cacheable lists →](../11-headers-and-cache)

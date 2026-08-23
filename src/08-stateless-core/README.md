# 08. The stateless core

The headline change in 2026-07-28. Two identical instances behind a round-robin
load balancer serve one conversation.

## You leave able to

- State what the revision removed (`initialize`, `initialized`, `Mcp-Session-Id`)
- Put application state in an explicit handle the model passes as an argument
- Pin protocol version so a 2025-only peer fails closed

## Run

```bash
pnpm example:08
```

Expect alternating instances:

```
call 1: served by instance #1:8091
call 2: served by instance #2:8092
call 3: served by instance #1:8091
...
```

No model key required.

## The revision removed

`initialize`, `initialized`, and the `Mcp-Session-Id` header ([SEP-2575](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2575),
[SEP-2567](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2567)). Each request carries its own protocol version, client identity, and
capabilities in `_meta`. A client that wants capabilities up front calls
`server/discover`, which stays optional, costs one round trip, and caches.

This demo could not work under 2025. You established a session against one
instance and later requests had to return to it. Sticky sessions or a shared
session store were mandatory. A reconnect meant running the whole handshake
again.

```
Model                    LB                    #1        #2
  |  startCart            |                     |         |
  |---------------------->|-------------------->|         |
  |  cart_8ea42a57        |<--------------------|         |
  |  addItem(cart_…)      |                     |         |
  |---------------------->|-------------------->|-------->|
  |  ok                   |<--------------------|<--------|
```

Any instance can serve `addItem` because the cart id is in the arguments.

Run [the Dockerfile](../../Dockerfile) and this stops being a demo: one image,
as many copies as you like, no affinity configured on the balancer. See
[docs/deployment.md](../../docs/deployment.md).

## State without sessions

The protocol carries no state for you. State tucked into the transport stays
invisible to the model.

Mint an explicit handle. `startCart` returns `cart_8ea42a57`. The model passes
it back to `addItem` and `viewCart` as an ordinary argument. The state joins the
conversation where the model can reason about it, and it survives whichever
instance answers.

The protocol holds no state. Your application still does, in a store you
chose, and choosing it is now your problem rather than the transport's.

`carts` is [`shared/store.ts`](../shared/store.ts), reached by both instances.
It is in-memory here; [module 14](../14-tasks) mints job handles against the
same thing. Three decisions are baked into that file, and each is the reason
it exists rather than a `Map` in each module:

**The interface is async.** A `Map` is not. Writing it async anyway means
swapping in Redis later changes one factory call rather than every handler
that touches it. A few `await`s today buys that.

**A TTL is mandatory.** A session used to expire when its connection did.
Nothing expires a cart id, so a store without eviction grows until the process
falls over. `CART_TTL_MS` is fifteen minutes here; pick what matches the work,
and say so in the tool description, because the model is what re-issues after
expiry.

**Read, modify, write.** `addItem` does this:

```ts
const cart = await carts.get(cartId);
cart.push(item);
await carts.set(cartId, cart);   // without this line, nothing happened
```

The in-memory store hands back the same array, so the write looks redundant
and is not. Against Redis the value you read is a copy, and a push that is
never written back is silently lost. A demo that relies on object identity
teaches a habit that breaks on the first day it matters.

Two more properties of a handle, neither of them the store's job:

**An expired handle is an `isError`, not a crash.** `addItem` with an unknown
id returns "Unknown or expired cart", so the model can start a new one and
carry on. A thrown error takes the conversation with it.

**A handle is a capability.** `cart_8ea42a57` reaching another user hands them
the cart. Bind it to the authenticated principal and check on every use,
exactly as [module 10](../10-mrtr) binds `requestState` with an HMAC.

## Pinning

The client passes `{ pin: '2026-07-28' }` and takes no silent fallback. Against
a 2025-only server, `connect()` rejects with `SdkError(EraNegotiationFailed)`
rather than handing you a session-based connection. Contrast
[module 07](../07-playwright-demo), which uses `auto` on purpose.

## Try this

1. Run and confirm instance ids alternate across calls in one cart conversation.
2. Add an item, then call `viewCart` repeatedly and confirm either instance
   answers with the same contents.
3. Point a throwaway client with `pin: '2026-07-28'` at a v1-only server and
   read the negotiation error.

## Stretch

Implement `Store<T>` over Redis, or over a JSON file if you want to stay
offline, and change the one line in [`server.ts`](server.ts) that constructs
it. Nothing else in the module should need touching, and carts should survive
restarting the process. If you find yourself editing a handler, the interface
was wrong.

Then drop `CART_TTL_MS` to ten seconds and watch a stale handle come back as
`isError` rather than an exception.

## Related

Factory shape: [01](../01-tools-only). Durable jobs with the same handle idiom:
[14](../14-tasks).

## Files

- [`server.ts`](server.ts): two instances, one shared cart store, round-robin listen
- [`../shared/store.ts`](../shared/store.ts): the async, TTL'd store both instances reach
- [`client.ts`](client.ts): pinned 2026 client driving the cart tools
- [`constants.ts`](constants.ts)

<!-- nav -->

---

Reference: [specification](https://modelcontextprotocol.io/specification/2026-07-28) ·
[schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) ·
[migration](../../docs/migration.md) ·
[threats](../../docs/security.md) ·
[SDK notes](../../docs/sdk-notes.md)

[← 07, A third-party server](../07-playwright-demo) · [09, OAuth 2.1, hardened →](../09-oauth-authentication)

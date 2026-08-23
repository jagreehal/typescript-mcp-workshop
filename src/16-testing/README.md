# 16. Testing

A real client against a real server over an in-memory transport, with no test
framework and no config.

## You leave able to

- Wire a `Client` to a server with `InMemoryTransport.createLinkedPair()`
- Assert the line between an `isError` result and a protocol rejection
- Test the `_meta` envelope by driving `handler.fetch` with a raw `Request`
- Say what the conformance suite is and why it now gates the specification

## Run

```bash
pnpm test
```

No model key, no port, no listener. The suite finishes in under half a second.

## No framework

```json
"test": "node --import tsx --test \"src/**/*.test.ts\""
```

Node's built-in runner covers `describe`, `test`, `before`, `after`, watch mode
and TAP output. `node:assert/strict` covers assertions. A workshop that adds
Vitest here would be teaching Vitest.

The one thing you give up is `expect`-style matchers. In exchange the suite has
no config file, no plugin resolution, and no version to keep in step with your
bundler.

## The transport is the trick

```ts
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
```

Two linked queues in place of a socket. Framing, `_meta` handling, schema
validation and dispatch all run for real; only the network is missing. That is
the right amount of fidelity for a unit test: fast enough to run on save, and
still failing when you break the protocol contract.

`InMemoryTransport` is exported from both `@modelcontextprotocol/server` and
`@modelcontextprotocol/client`.

## The factory is already the unit

[`server.ts`](server.ts) exports `buildServer` instead of calling `serveHttp`
at the bottom. That is the only structural difference from every other module,
and it is not a concession to testing: `createMcpHandler` calls the factory once
per request, so a test calling it too is using the same seam production does.

Pass the store in, and each test gets its own:

```ts
export function buildServer(orders: Map<string, Order> = seedOrders()) { … }
```

## The four things worth pinning

**A successful call carries both halves.** Assert `content` and
`structuredContent`. A tool that drops either is broken for one of its two
audiences, and nothing else will tell you.

**A business failure is a result, not a rejection.** This is the single most
common MCP bug: throwing where you should return. A thrown error never reaches
the conversation, so the model cannot recover from it. One assertion stops that
regressing.

**A schema violation is also a result.** The SDK validates `inputSchema` before
your handler runs and turns a failure into an `isError` result rather than
`-32602`. That is the behaviour you want, because the model gets told what was
wrong with its arguments. It also means a client that only inspects rejections
misses every validation error, so pin it.

**A malformed envelope is a rejection.** The SDK client always builds a correct
`_meta` envelope, so testing that your server rejects a bad one means bypassing
the client:

```ts
const handler = createMcpHandler(() => buildServer());
const response = await handler.fetch(new Request('http://localhost/mcp', { … }));
```

`handler.fetch` takes a standard `Request` and returns a standard `Response`,
so this needs no port and no listener either.

## Conformance

The specification now has a [conformance suite](https://github.com/modelcontextprotocol/conformance).
Two things follow, and both are new in this revision:

1. A Standards Track SEP cannot reach Final until a matching scenario lands in
   the suite ([SEP-2484](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2484)).
2. The same suite scores official SDKs under the
   [tier system](https://modelcontextprotocol.io/docs/sdk).

If you publish a server, run it against the suite. Your own tests prove your
tools behave; the suite proves your server is an MCP server.

## Try this

1. Change `refund_order` to `throw new Error('already refunded')` instead of
   returning `isError`. Watch exactly one test fail, and read what it says.
2. Delete the `_meta` assertions and send the raw request with a valid
   envelope. Confirm it succeeds, so you know the test was testing something.
3. Run `node --import tsx --test --watch "src/**/*.test.ts"` and leave it up
   while you edit `server.ts`.

## Stretch

Write a test for [module 08](../08-stateless-core)'s cart tools that proves a
handle minted against one server instance is readable from another. That is the
property the whole revision is built on, and it is two factories and one shared
store away from being a regression test.

## If it breaks

| Symptom | Likely cause |
|---|---|
| `Cannot find module` on a `.ts` import | The `--import tsx` flag is missing |
| No tests found | The glob needs quoting, or your shell expanded it |
| A test hangs | A client was never closed; `after()` should close it |
| `Property 'text' does not exist` | `content` is a union of block types; narrow before reading |

## Related

Tool errors versus protocol errors: [01](../01-tools-only). The `_meta`
envelope: [01](../01-tools-only), [08](../08-stateless-core). Before you ship:
[docs/security.md](../../docs/security.md).

## Files

- [`server.ts`](server.ts): the server under test, exporting its factory
- [`server.test.ts`](server.test.ts): five tests over a live client and a raw `Request`
- [`store.test.ts`](store.test.ts): five tests over [`shared/store.ts`](../shared/store.ts), the store modules 08 and 14 mint handles against. `now` is injected, so expiry is exercised without a sleeping test

---

**Spec**: [conformance](https://github.com/modelcontextprotocol/conformance) ·
[SDK tiers](https://modelcontextprotocol.io/docs/sdk) ·
**SEP**: [2484](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2484)

[← 15, MCP Apps](../15-mcp-apps) · [index →](../../README.md)

<!-- nav -->

---

Reference: [specification](https://modelcontextprotocol.io/specification/2026-07-28) ·
[schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) ·
[migration](../../docs/migration.md) ·
[threats](../../docs/security.md) ·
[SDK notes](../../docs/sdk-notes.md)

[← 15, MCP Apps](../15-mcp-apps) · [index →](../../README.md)

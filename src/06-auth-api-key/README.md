# 06. API-key auth

The smallest auth that still counts, and how identity reaches a tool handler on
a sessionless transport.

## You leave able to

- Plug an `authenticate` hook that returns `authInfo` for the request factory
- Compare secrets with `timingSafeEqual`
- Enforce scopes inside tools via `isError` results the model can surface

## Run

```bash
pnpm example:06
```

Three callers: no key (rejected), Alice (read only), Bob (read and write).

No model key required.

## Concepts

**The SDK verifies nothing.** `authenticate` runs ahead of the handler.
Whatever it returns arrives at the factory as `ctx.authInfo`, untouched. The
SDK docs state the entry performs no token verification. Transport comes from
the library; authorization comes from you. Module 09 keeps the same split and
swaps only the verifier.

**Identity binds to a request, not a connection.** Without sessions there is no
authenticated connection whose identity could leak between callers. The factory
closes over one verified caller, then you discard it.

**Compare in constant time.** Use `timingSafeEqual` over `===`. A
byte-at-a-time timing difference gives an attacker the key.

**You write the scope checks.** The SDK holds no concept of a scope.
`requireScope` opens each tool and returns an `isError` result rather than
throwing, so the model can tell the user which permission it lacks.

**Never accept a token that was not issued for you.** This is the **token
passthrough** anti-pattern, and the specification names it as prohibited. A
server that takes a caller's token and forwards it downstream loses three
things at once: the downstream API's rate limits and validation are bypassed,
its logs name your server rather than the real caller so an incident cannot be
reconstructed, and anyone holding a stolen token gets your server as an
exfiltration proxy. Validate the audience against your own identity, on every
request. Module 09 does exactly this with a JWKS verifier; here `authenticate`
is the same seam with a simpler secret.

**The guards you did not write are in `shared/serve.ts`.**
[`serveHttp`](../shared/serve.ts) validates the `Host` and `Origin` headers
before anything else in the request, and answers 403 itself. That stops **DNS
rebinding**: an attacker's page resolves a hostname to `127.0.0.1` and posts to
your local server from the browser, carrying whatever the browser will attach.
Binding loopback is not sufficient on its own, which is why both run.

## Threat notes

| Risk | This module |
|---|---|
| Missing auth | Unauthenticated call rejected at the gate |
| Scope creep | Alice cannot write; Bob can |
| Secret exposure | Keys live in env / constants for the demo; production uses a secret store |
| Token passthrough | Audience checked against this server; nothing is forwarded |
| DNS rebinding | `Host` and `Origin` validated in `shared/serve.ts` |
| Timing attack | `timingSafeEqual`, never `===` |

Deeper OAuth threats (mix-up, confused deputy, step-up, resource indicators)
land in [module 09](../09-oauth-authentication). The whole catalogue, mapped to
modules, is in [docs/security.md](../../docs/security.md).

## Try this

1. Run with no `Authorization` header path (the client does this first). Expect
   rejection before any tool runs.
2. Run as Alice against a write tool. Expect an `isError` scope message.
3. Run as Bob. Expect the write to succeed.

## Stretch

Add a third key with a `admin` scope and a tool that requires it. Keep the
check inside the handler as an `isError` result.

## Related

OAuth 2.1 hardening: [09](../09-oauth-authentication). Header-based gate
routing: [11](../11-headers-and-cache).

## Files

- [`server.ts`](server.ts): `authenticate` + scoped tools
- [`client.ts`](client.ts): three callers
- [`constants.ts`](constants.ts)

<!-- nav -->

---

Reference: [specification](https://modelcontextprotocol.io/specification/2026-07-28) ·
[schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) ·
[migration](../../docs/migration.md) ·
[threats](../../docs/security.md) ·
[SDK notes](../../docs/sdk-notes.md)

[← 05, Multiple servers](../05-multi-server) · [07, A third-party server →](../07-playwright-demo)

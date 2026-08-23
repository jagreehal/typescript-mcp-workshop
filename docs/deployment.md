# Deploying a stateless MCP server

[Module 08](../src/08-stateless-core) proves the protocol no longer needs
sticky routing. This page is what you do with that.

## One container, many copies

```bash
docker build -t mcp-workshop .
docker run -p 8087:8087 mcp-workshop
```

The [`Dockerfile`](../Dockerfile) at the repo root runs one instance. It
defaults to module 01, which binds 8087. `MODULE` picks a different server, and
each module has its own port, so publish the one it binds:

```bash
docker run -p 8091:8091 -e MODULE=src/08-stateless-core/server.ts mcp-workshop
```

Run as many copies as you like behind any load balancer, with no affinity
configured. That is the whole deployment story for the protocol layer, and it
is the change `2026-07-28` bought you.

`MCP_BIND_HOST=0.0.0.0` is set in the image. Everywhere else in this workshop
a server binds `127.0.0.1`, because reachable-by-anything should be a thing
you asked for.

## What still needs to be shared

The protocol holds no state. Your application does, and every instance must
see the same copy of it:

| State | Where it lives in this workshop | What you replace it with |
|---|---|---|
| Cart handles ([08](../src/08-stateless-core)) | `createInMemoryStore` in [`shared/store.ts`](../src/shared/store.ts) | any `Store<T>` over Redis or Postgres |
| Task records ([14](../src/14-tasks)) | the same store, a different TTL | the same swap, so a poll survives a restart |
| Subscription events ([13](../src/13-subscriptions)) | a `ServerEventBus` wrapping `InMemoryServerEventBus` | the same two methods over Redis pub/sub or NATS |
| `requestState` HMAC key ([10](../src/10-mrtr)) | `process.env.MCP_STATE_KEY` | the same secret on every instance |

The first three are each one line. `Store<T>` is three methods, `ServerEventBus`
is two, and both are async already, so nothing in a handler changes when the
implementation does. That is the whole reason they are interfaces rather than a
`Map` in each module.

Get the task store wrong and a client polling a handle hits an instance that
has never heard of it. Get the bus wrong and an open stream sees only the
events raised by whichever instance happens to be holding it, with no error
either side to say so.

## Health checks

A load balancer needs something cheaper than a tool call. `serveHttp` takes a
`routes` hook that runs before the MCP endpoint:

```ts
await serveHttp(buildServer, PORT, {
  routes: (request, response) => {
    if (request.url !== '/health') return false;
    response.writeHead(200).end('ok');
    return true;
  },
});
```

Do not point a health check at `/mcp`. A `server/discover` per instance per
second is a real cost, and a 200 from it tells you less than you think.

## Sizing

Each request builds a fresh server instance through the factory, which is why
the factory should stay cheap. If yours opens a database connection, open the
pool once at module scope and close over it. The factory is called on the hot
path; nothing else in this design is.

## What this page does not cover

Vendor specifics. A container that listens on a port and holds no session
state deploys the same way on every platform, and anything more detailed than
the above dates faster than the protocol does.

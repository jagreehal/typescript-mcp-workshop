# 02. Resources

Expose read-only data by URI, with the `ttlMs` / `cacheScope` fields
2026-07-28 added ([SEP-2549](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2549)).

## You leave able to

- Tell resources apart from tools (who initiates, side effects, arguments)
- Register a concrete resource and a URI template with a `list` callback
- Set per-resource cache hints without leaking private data into a shared cache

## Run

```bash
pnpm example:02
```

No model key required. The client lists, reads, and exercises the volatile URI.

## Concepts

**Resources vs tools.** The model decides to call a tool. The client fetches a
resource by URI: no side effects, no arguments beyond the URI itself. Use a
resource for context the host or model should read. Use a tool for an action.

**Templates.** `data://metrics/{team}.csv` is one registration covering an
unbounded family. Supply a `list` callback so concrete URIs appear in
`resources/list`. Skip `list` and the template still works, but nothing can
discover the members.

**Cache fields ([SEP-2549](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2549)).** `resources/read` and the list verbs carry `ttlMs`
and `cacheScope`:

| Value | Meaning |
|---|---|
| `ttlMs: 0` | Do not cache (default) |
| `cacheScope: 'private'` | Per client; anything derived from the caller |
| `cacheScope: 'public'` | Shareable; content that cannot vary by caller |

Set them per resource with `cacheHint`, or per operation with the server's
`cacheHints` option. The per-resource hint wins, field by field.

Mark something `'public'` that varies with the caller's identity and a shared
cache serves one user's data to another. Choose `'private'` when unsure.

**Binary content** travels base64-encoded in `blob`, and stays out of `text`.
For images and audio inside a *tool* result, the typed `ImageContent` and
`AudioContent` blocks carry the same bytes with a `mimeType` the model can act
on. A `ResourceLink` points at a resource without inlining it; an
`EmbeddedResource` carries the contents along. Link when the host can fetch it,
embed when the model needs it in this turn.

**Reads throw on failure.** A missing resource raises a protocol error
instead of returning an `isError` result the way a tool does.
`volatile://might-fail` fails about a third of the time so you can watch it.

> **That error code changed.** A missing resource used to be the MCP-specific
> `-32002`. On 2026-07-28 it is the JSON-RPC standard `-32602` Invalid Params
> ([SEP-2164](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2164)).
> A client matching on the literal `-32002` stops recognising it.

## Pagination

Every list verb is paginated. `listResources()` with no argument walks all the
pages and hands you the aggregate, bounded by `listMaxPages` (64 by default) so
a server whose `nextCursor` never advances cannot spin you forever. Against a
paginating server that is usually what you want.

Pass a cursor and you get one raw page instead, uncapped:

```ts
// Page one has no cursor, so the raw path starts with request().
let page = await client.request({ method: 'resources/list', params: {} });
while (page.nextCursor) {
  page = await client.listResources({ cursor: page.nextCursor });
}
```

`listResources({ cursor: undefined })` is not the per-page path. The SDK
branches on the cursor's *value*, so an undefined one takes the aggregating
walk, which is why page one comes from `request()`.

A cursor is an **opaque server-side handle**. Do not parse one, do not build
one. It belongs to the same family as [module 08](../08-stateless-core)'s cart
id, and for the same reason: with no session there is nowhere else to keep your
position in a list.

### Serving pages is not something `McpServer` does

This demo returns one page, and not because the catalogue is small.
**`McpServer` has no pagination hook at all.** `registerResource` takes no page
size, and a template's `list` callback receives only `ctx`, never a cursor. It
answers `resources/list` with everything, always.

The low-level escape hatch does not reach it either:

```ts
server.server.setRequestHandler('resources/list', handler);  // registers, never runs
```

That call is accepted and the handler is never invoked, because `McpServer`
owns the methods it registered and dispatches to its own. Verified, not
assumed: put a `console.log` in the handler and nothing prints. The same thing
happens to `tasks/get` in [module 14](../14-tasks), for the same reason.

So a server that must paginate is built on the low-level `Server` class rather
than `McpServer`, and assembles its own list:

```ts
import { Server } from '@modelcontextprotocol/server';

const server = new Server({ name, version }, { capabilities: { resources: {} } });

server.setRequestHandler('resources/list', async (request) => {
  const start = decodeCursor(request.params?.cursor);       // reject a forged one
  const page = catalogue.slice(start, start + PAGE_SIZE);
  return {
    resources: page,
    // Absent on the last page. That absence is what ends the client's walk.
    nextCursor: start + page.length < catalogue.length ? encodeCursor(start + page.length) : undefined,
  };
});
```

You give up `registerResource`, `registerTool` and the rest, and you write the
`resources/read` dispatch yourself. Worth it when the catalogue is large enough
that a client on a slow link pays for the whole thing before it can show
anything, and not before.

Two rules if you go there. Encode a **sort key**, not an offset, so an insert
does not shift rows a client already walked past. And treat an incoming cursor
as untrusted input: reject a malformed one with `-32602` rather than silently
restarting at zero, which is how a client ends up looping over page one
forever.

## Try this

1. List resources. Confirm the template expands into concrete team URIs.
2. Read one metrics URI. Note `ttlMs` / `cacheScope` on the result if present.
3. Hit `volatile://might-fail` a few times until you see `-32602`.
4. Add `server.server.setRequestHandler('resources/list', …)` with a
   `console.log` inside it, rerun, and confirm it never fires. That is the
   constraint above, in ten seconds.

## Stretch

Add `docs://{slug}` with a `list` of two documents and
`cacheHint: { ttlMs: 60_000, cacheScope: 'public' }`. Mis-set `cacheScope` to
`'public'` on a URI that embeds a user id, then write one sentence on the leak.

## Related

Cacheable `tools/list` shows up again in [module 11](../11-headers-and-cache).
Change notifications for lists and URIs are in
[module 13](../13-subscriptions).

## Files

- [`server.ts`](server.ts): concrete resources, template, volatile failure
- [`client.ts`](client.ts): list + read loop
- [`constants.ts`](constants.ts)

<!-- nav -->

---

Reference: [specification](https://modelcontextprotocol.io/specification/2026-07-28) ·
[schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) ·
[migration](../../docs/migration.md) ·
[threats](../../docs/security.md) ·
[SDK notes](../../docs/sdk-notes.md)

[← 01, Tools](../01-tools-only) · [03, Prompts →](../03-prompts)

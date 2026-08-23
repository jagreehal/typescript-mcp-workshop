# 11. Header routing and cacheable lists

A gateway that blocks, meters, and routes MCP traffic without parsing a
JSON-RPC body ([SEP-2243](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2243), [SEP-2549](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2549)).

## You leave able to

- Route and rate-limit on `Mcp-Method` / `Mcp-Name` alone
- Promote a tool argument to `Mcp-Param-*` with `x-mcp-header`
- Cache `tools/list` via `ttlMs` / `cacheScope` with stable ordering

## Run

```bash
pnpm example:11
```

Three processes: server, gateway, client. Watch the gateway's output.

## Header routing ([SEP-2243](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2243))

Streamable HTTP requests carry:

```
Mcp-Method: tools/call
Mcp-Name:   search
```

Before these headers, a WAF or rate limiter in front of an MCP server had to
buffer the body, parse JSON, and understand JSON-RPC to tell a cheap
`tools/list` from an expensive `tools/call`. Now it reads headers the way it
already does for the rest of your HTTP surface.

[`gateway.ts`](gateway.ts) imports no MCP SDK and no JSON-RPC parser. You could
write the same policy in nginx, Envoy, or a Cloudflare Worker.

```
tools/call/search (1/9)
403 tools/call/drop_database, tool "drop_database" is blocked by policy
429 tools/call/expensive_report, rate limit for tools/call exceeded
```

## Custom parameter headers (same SEP)

`Mcp-Method` and `Mcp-Name` are fixed. A tool can promote one of its own
arguments to a header. Declare it on the property:

```ts
inputSchema: z.object({
  tenantId: z.string().meta({ 'x-mcp-header': 'Tenant-Id' }),
  month: z.string(),
})
```

Every call arrives as:

```
Mcp-Method:          tools/call
Mcp-Name:            tenant_report
Mcp-Param-Tenant-Id: acme
```

The client mirrors the value from the tool definition. Calling code still passes
an ordinary argument. The gateway meters per tenant, or shards tenant → upstream
pool, while remaining a body-blind HTTP proxy.

Treat the header as a checked claim. The server compares each declared header
against the body argument and answers `-32020 HeaderMismatch` when they
disagree. A mismatched header otherwise lets a caller route as a cheap tenant
while requesting an expensive tenant's data.

Rules are narrow on purpose: `string`, `integer`, or `boolean` properties only;
an RFC 9110 token for the header name; the property must be reachable in the
static schema. An annotation under `oneOf`, `items`, or `additionalProperties`
invalidates the whole tool definition. A header a gateway cannot predict from
the schema alone is worth nothing to it.

## Cacheable lists ([SEP-2549](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2549))

`tools/list` carries `ttlMs` and `cacheScope`, and its order holds steady. The
client caches on those terms. The demo makes two calls and one `tools/list`
reaches the server.

Two payoffs:

1. **No catalog fetch per connection.** That cost used to amortise across a
   session. There is no session now.
2. **Stable upstream prompt caches.** Shuffle tool definitions between
   reconnects and the serialised tool block at the head of your model prompt
   changes, which invalidates provider-side prompt cache entries.

Stable ordering is what makes the second one work.

## Try this

1. Watch the gateway allow `search`, block `drop_database`, and 429
   `expensive_report`.
2. Confirm a second `tools/list` from the client does not hit the server while
   the TTL holds.
3. Mismatch `Mcp-Param-Tenant-Id` against the body (manual curl) and confirm
   `-32020`.

## Error codes you will see here

The revision added three, and this module is where the first one shows up.

| Code | Name | Raised when |
|---|---|---|
| `-32020` | `HeaderMismatch` | A declared header disagrees with the body argument it mirrors |
| `-32021` | `UnsupportedProtocolVersion` | The `_meta` envelope names a revision this server will not serve |
| `-32022` | `MissingRequiredClientCapability` | The server needs a capability the request's envelope did not declare |

The last one is what a server returns when a client calls into an extension it
never declared support for, so it belongs with [module 14](../14-tasks) and
[module 15](../15-mcp-apps) as much as here.

## Production checklist

- `Mcp-Method` and `Mcp-Name` are **required** on Streamable HTTP, not a convenience. A gateway may rely on their presence
- Deny by default on `Mcp-Name` allowlists for mutating tools
- Alert on `HeaderMismatch` volume (tamper or buggy client)
- Keep list order stable across deploys when you rely on provider prompt caches
- Pair short `ttlMs` with [subscriptions](../13-subscriptions) for listeners

## Related

OAuth gate using `Mcp-Name`: [09](../09-oauth-authentication). Resource cache
hints: [02](../02-resources).

## Files

- [`server.ts`](server.ts): tools + cache hints + header params
- [`gateway.ts`](gateway.ts): body-blind policy proxy
- [`client.ts`](client.ts): drives allow / deny / rate-limit / cache
- [`constants.ts`](constants.ts)

<!-- nav -->

---

Reference: [specification](https://modelcontextprotocol.io/specification/2026-07-28) ·
[schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) ·
[migration](../../docs/migration.md) ·
[threats](../../docs/security.md) ·
[SDK notes](../../docs/sdk-notes.md)

[← 10, Multi Round-Trip Requests](../10-mrtr) · [12, Observability →](../12-observability)

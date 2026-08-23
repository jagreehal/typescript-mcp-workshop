# Migrating from 2025-11-25 to 2026-07-28

Every change in the revision, and the module that runs it.

If you have a working MCP server on `2025-11-25`, read the first table. It is
ordered by how much of your code each change touches.

## Breaking

| What changed | SEP | Your code | Module |
|---|---|---|---|
| `initialize` / `initialized` removed | [2575](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2575) | Protocol version, client info and capabilities move into `_meta` on every request. A client that wants capabilities up front calls `server/discover`. | [08](../src/08-stateless-core) |
| `Mcp-Session-Id` removed | [2567](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2567) | Delete your sticky routing and your session store. Application state becomes an explicit handle you mint and the model passes back. | [08](../src/08-stateless-core) |
| `Mcp-Method` and `Mcp-Name` headers required | [2243](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2243) | Nothing, if you use the SDK. Everything, if you wrote a proxy that parses bodies. | [11](../src/11-headers-and-cache) |
| Elicitation and sampling stop being pushed down a stream | [2322](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2322) | A handler that asked the user something becomes a resumable state machine returning `resultType: "input_required"`. | [10](../src/10-mrtr) |
| The GET SSE endpoint and `resources/subscribe` removed | [2575](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2575) | Server push becomes one client-opened `subscriptions/listen` POST with an explicit filter. | [13](../src/13-subscriptions) |
| `ping` and `logging/setLevel` removed | [2577](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577) | Log level is per request, in `_meta`. A server MUST NOT emit `notifications/message` for a request that did not ask for one. | [13](../src/13-subscriptions) |
| `tasks/*` moved out of core into an extension | [2663](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2663) | Not backward compatible. `tasks/list` is gone, `tasks/get` replaces the blocking `tasks/result`, and creation is server-directed. | [14](../src/14-tasks) |
| Missing resource: `-32002` becomes `-32602` | [2164](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2164) | A client matching on the literal `-32002` stops recognising the error. | [02](../src/02-resources) |

## Additive

| What changed | SEP | Why you want it | Module |
|---|---|---|---|
| `ttlMs` and `cacheScope` on lists and reads | [2549](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2549) | No catalog fetch per connection, and a stable tool block at the head of your model prompt. | [02](../src/02-resources), [11](../src/11-headers-and-cache) |
| Custom parameter headers | [2243](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2243) | A gateway meters and shards per tenant without reading a body. | [11](../src/11-headers-and-cache) |
| Extensions become first class | [2133](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2133) | Reverse-DNS identifiers, negotiated through `capabilities.extensions`, versioned apart from the core. | [14](../src/14-tasks), [15](../src/15-mcp-apps) |
| MCP Apps | [1865](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1865) | A tool ships an interface, rendered in a sandboxed iframe by any compliant host. | [15](../src/15-mcp-apps) |
| Full JSON Schema 2020-12 for tools | [2106](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2106) | `oneOf`, `$ref`, `$defs` in input schemas; output schemas unrestricted. | [01](../src/01-tools-only) |
| W3C trace context key names fixed | [414](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/414) | `traceparent` rides `_meta`, so a trace crosses the MCP boundary. | [12](../src/12-observability) |
| Icons on tools, resources, prompts and implementations | — | A host's tool picker gets something to draw. Behaviour is unchanged. | [01](../src/01-tools-only) |
| Server-initiated requests only while processing one | [2260](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2260) | Previously a recommendation, now a MUST. A user is never prompted out of nowhere. | [10](../src/10-mrtr), [13](../src/13-subscriptions) |

## Authorization hardening

All six land in [module 09](../src/09-oauth-authentication).

| SEP | Change |
|---|---|
| [2468](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2468) | Clients MUST validate `iss` on the authorization response ([RFC 9207](https://www.rfc-editor.org/rfc/rfc9207)), which is what closes the mix-up attack. |
| [837](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/837) | Clients declare `application_type`, so an authorization server stops rejecting a CLI's `http://127.0.0.1` redirect. |
| [2352](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2352) | Registered credentials bind to the issuer that minted them. |
| [2207](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2207) | How to request refresh tokens from an OIDC-style authorization server. |
| [2350](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2350) | Scope accumulation during step-up: the client unions, it does not replace. |
| [2351](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2351) | The `.well-known` discovery suffix. |

## Deprecated, still working

Annotation-only under the [feature lifecycle policy](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577). Everything below keeps
working in this release and in every release published within a year of it.
Removing any of it needs its own SEP.

| Feature | Use instead |
|---|---|
| Roots | Tool parameters, resource URIs, or server configuration |
| Sampling | Call your model provider directly |
| Logging | stderr on stdio, OpenTelemetry everywhere else ([module 12](../src/12-observability)) |

## Unchanged, and worth re-checking anyway

**Pagination.** `Cursor`, `PaginatedRequest` and `PaginatedResult` work as they
did. What changed around them is that there is no session to hold your place in
a list any more, so a cursor is now the only thing standing between a client
and refetching a catalogue from the start. The v2 client handles both paths;
`McpServer` cannot serve pages at all ([sdk-notes.md](sdk-notes.md)).

**`notifications/progress` and `notifications/cancelled`.** Still
request-scoped, still riding the response stream of the call they belong to.
They did **not** move onto `subscriptions/listen`, and a client that stopped
receiving progress after the migration is usually one that was reading it off
the removed GET stream ([13](../src/13-subscriptions)).

## Migrating a client before the servers you talk to

`mode: 'auto'` probes with `server/discover` and falls back to the 2025
handshake when nothing modern comes back. You adopt the revision now and the
servers you call catch up whenever they like. [Module 07](../src/07-playwright-demo)
runs it against a real v1 server, and names the two cases where you should not
use it.

## How the protocol evolves from here

Three governance changes aim to stop a repeat of this release:

- Every feature now has an Active → Deprecated → Removed path with at least
  twelve months between the last two.
- New capabilities ship as opt-in extensions and stabilise there before they
  are considered for the core.
- A Standards Track SEP cannot reach Final until a matching scenario lands in
  the [conformance suite](https://github.com/modelcontextprotocol/conformance),
  the same suite the SDK tier system scores against. [Module 16](../src/16-testing)
  covers what that means for your tests.

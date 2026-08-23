# Threats, and which module answers each one

Read this before you ship. The modules teach mechanisms; this page names the
attacks those mechanisms exist to stop, so you can tell whether your server
actually stops them.

Each row links to the code in this workshop that demonstrates the control.

## The ones that bite hardest

### Token passthrough

A server accepts a token it was not issued, and forwards it to a downstream
API. The spec calls this out: a server **MUST NOT** accept any token that was
not explicitly issued for it.

What breaks: the rate limits, validation and monitoring on the downstream API
are bypassed. Its logs name your server rather than the real caller, so an
incident cannot be reconstructed. Anyone holding a stolen token gets your
server as an exfiltration proxy.

The control: validate the `aud` claim against your own identity, every
request. [Module 09](../src/09-oauth-authentication) does this in
`requireBearerAuth`; [module 06](../src/06-auth-api-key) shows the same seam
with an API key.

### Confused deputy

Your server proxies OAuth to a third party using a static client ID. A user
consented once, so the authorization server holds a consent cookie. An
attacker sends that user a crafted authorization request with their own
redirect URI. The consent screen is skipped, the code lands on the attacker's
endpoint, and it is exchanged for a token belonging to your user.

The control: a proxy using a static client ID **MUST** obtain consent for each
dynamically registered client, validate redirect URIs strictly, and require
PKCE. [Module 09](../src/09-oauth-authentication) runs PKCE S256 and a real
consent step.

### Authorization server mix-up

A client that talks to several authorization servers is induced to redeem a
code at the wrong one. [RFC 9207](https://www.rfc-editor.org/rfc/rfc9207)'s
`iss` parameter on the authorization response is the fix, and validating it
before redemption became mandatory in this revision (SEP-2468). Step 6 of
[module 09's client](../src/09-oauth-authentication/client.ts) runs the check.

### Prompt injection through tool descriptions

Tool names, descriptions and results are untrusted text that reaches your
model's context. A server you connect to can write a description that
instructs the model to call a different server's tool with data it should not
share. Nothing in the protocol prevents this.

The controls, in order of how much they buy you:

1. Take identity from the token, never from a tool argument the model can be
   talked into changing ([module 06](../src/06-auth-api-key)).
2. Scope every tool, and enforce at the HTTP layer where a challenge can be
   acted on ([module 09](../src/09-oauth-authentication)).
3. Prefix tool namespaces per server, so a call cannot silently land on the
   wrong one ([module 05](../src/05-multi-server)).
4. Require a human for anything without `readOnlyHint`. Annotations are hints,
   and your own check is what enforces ([module 01](../src/01-tools-only)).

### Path traversal

A filesystem server without a root check hands over `/etc/passwd`. Scanning
the raw string for `..` is not enough: symlinks and encodings walk straight
past it. Resolve first, then check containment.
[Module 04](../src/04-stdio-filesystem) has the whole security model in
`resolveWithinRoot`, and the client asks for `../../../etc/passwd` so you can
watch it refuse.

### DNS rebinding

An attacker's web page resolves a hostname to `127.0.0.1` and posts to your
local MCP server from the browser. The `Host` and `Origin` guards in
[`shared/serve.ts`](../src/shared/serve.ts) reject that, and they run before
anything else in the request. This is why a local server binds loopback and
still checks headers.

### Untrusted UI

MCP Apps renders HTML a server supplied. The spec's threat model names five
cases: malicious HTML, sandbox escape, unauthorized tool execution, data
exfiltration, and phishing.

The controls are all the host's: a sandboxed iframe with no access to host DOM,
cookies or storage; all communication as auditable JSON-RPC over `postMessage`;
templates declared up front so they can be reviewed and hashed before anything
runs; and a CSP built only from what the server declared, so an undeclared
domain is a blocked domain. [Module 15](../src/15-mcp-apps) builds the policy
in front of you.

## What changed in this revision

Session hijacking used to be near the top of this list. A stolen
`Mcp-Session-Id` let an attacker impersonate a client, and a shared session
store spread the damage across instances. `2026-07-28` removed protocol
sessions, so the class is gone rather than mitigated.

What replaced it: every request must carry its own identity, and a server that
skips per-request authorization has no session to hide behind. That is a
better default, and it is also less forgiving of a server that authenticates
once and trusts thereafter.

## Checklist

Before a server leaves your machine:

- [ ] Every request is authorized. Nothing is trusted because an earlier request was.
- [ ] Token audience is checked against this server's own identity.
- [ ] Secrets are compared with `timingSafeEqual`, never `===`.
- [ ] Scopes are enforced at the HTTP layer, so an insufficiently-scoped call gets a challenge it can act on.
- [ ] Identity comes from the token, never from a tool argument.
- [ ] Filesystem and network reach are bounded, and the check runs after resolution.
- [ ] `Host` and `Origin` are validated.
- [ ] Tool results carrying user data are not logged or traced by default ([module 12](../src/12-observability) keeps `captureResults` off).
- [ ] Tool descriptions from servers you do not control are treated as untrusted text.
- [ ] Anything the client hands back — a cursor, a `requestState`, a cart id, a task id — is validated on arrival, and bound to the principal that was given it.
- [ ] There is a test for each of the above that fails when the control is removed ([module 16](../src/16-testing)).

## Further reading

- [MCP authorization specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [MCP security best practices](https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices)
- [RFC 9207, OAuth 2.0 Authorization Server Issuer Identification](https://www.rfc-editor.org/rfc/rfc9207)
- [RFC 8707, Resource Indicators for OAuth 2.0](https://www.rfc-editor.org/rfc/rfc8707)
- [RFC 7636, PKCE](https://www.rfc-editor.org/rfc/rfc7636)

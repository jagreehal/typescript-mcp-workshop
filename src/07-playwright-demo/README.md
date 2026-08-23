# 07. A third-party server

Connect to `@playwright/mcp`, built on the v1 SDK and speaking 2025-11-25, from
a 2026-07-28 client.

## You leave able to

- Read the negotiated era (`legacy` vs modern) off a connection
- Use `mode: 'auto'` to probe with `server/discover` and fall back to
  `initialize`
- Know when to skip `auto` (spawn-per-invocation CLIs, byte-stable transcripts)

## Run

```bash
pnpm example:07
```

The client launches Playwright MCP itself.

## Concepts

**The connection reports era `legacy`.** `mode: 'auto'` probes with
`server/discover`, sees nothing modern come back, and falls back to the plain
`initialize` handshake: byte for byte what a 2025 client would have sent.

**That fallback is how you migrate.** Adopt 2026-07-28 in your client without
waiting for every server you talk to. The probe costs one extra round trip over
HTTP, and one extra short-lived process over stdio ([module 04](../04-stdio-filesystem)).

**Skip `auto` for spawn-per-invocation CLI tools**, and for anything whose
value rests on byte-stable transcripts. A legacy stdio server that ignores
unknown pre-`initialize` requests stalls `connect()` for the full probe timeout
before falling back. Keep a pinned era as the default in production configs.
Expose `auto` behind a flag when you need discovery.

## Try this

1. Run the module. Confirm the logged era is `legacy`.
2. List tools from Playwright MCP and call one safe read-only tool.
3. Pin `{ pin: '2026-07-28' }` in a throwaway edit and confirm connect fails
   instead of falling back (restore afterwards).

## Related

Stateless modern servers: [08](../08-stateless-core). Explicit pin behaviour
there shows the other side of negotiation.

## Files

- [`client.ts`](client.ts): spawns Playwright MCP, negotiates era

<!-- nav -->

---

Reference: [specification](https://modelcontextprotocol.io/specification/2026-07-28) ·
[schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) ·
[migration](../../docs/migration.md) ·
[threats](../../docs/security.md) ·
[SDK notes](../../docs/sdk-notes.md)

[← 06, API-key auth](../06-auth-api-key) · [08, The stateless core →](../08-stateless-core)

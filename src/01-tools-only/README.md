# 01. Tools

Register tools with `registerTool`, return structured results, and learn the
per-request server factory that 2026-07-28 depends on.

## You leave able to

- Register tools with Zod `inputSchema` / `outputSchema` and annotations
- Choose between a tool-level `isError` result and a thrown protocol error
- State the reason `serveHttp` builds a fresh `McpServer` for every request

## Run

```bash
pnpm example:01
```

Server alone: `pnpm example:server:01`. Client alone: `pnpm example:client:01`.

Inspect without the demo client:

```bash
pnpm example:server:01
# other terminal
pnpm inspect
# connect to http://127.0.0.1:8087/mcp (Streamable HTTP)
```

## Concepts

**Factory per request.** `serveHttp(buildServer, PORT)` calls `buildServer()`
once per HTTP request. No handshake pins an instance and no session keeps one
alive, so the instance holds nothing between calls. Module 08 puts two of these
behind round-robin.

**Tool errors vs protocol errors.** `divide` returns
`{ isError: true, content: [...] }` on a zero divisor. The model reads that and
recovers. A thrown `ProtocolError` fails at the JSON-RPC layer, where the
conversation cannot react. Throw for a malformed request. Return for a handled
failure inside a valid call.

**Structured output.** `divide` declares `outputSchema` and returns
`structuredContent` next to its text. The model reads the text. A programmatic
caller reads the typed object. The SDK validates the structured half against the
schema on the way out.

**Annotations hint.** `readOnlyHint` and `idempotentHint` tell a host what may
need a human in the loop. Your scope check does the enforcing (module 06).

## On the wire

```
POST /mcp
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: add

{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
  "name":"add","arguments":{"a":25,"b":17},
  "_meta":{
    "io.modelcontextprotocol/protocolVersion":"2026-07-28",
    "io.modelcontextprotocol/clientInfo":{"name":"my-app","version":"1.0"},
    "io.modelcontextprotocol/clientCapabilities":{}
  }}}
```

No `Mcp-Session-Id`. This revision requires the `_meta` envelope. Leave a field
out and the server answers `-32602` naming it.

## Try this

1. Call `add` with `25` and `17`. Expect `42`.
2. Call `divide` with divisor `0`. Expect `isError: true` and recoverable text.
3. In Inspector, change `add`'s `a` to a string the schema rejects. Expect a
   protocol-level invalid-params failure, not an `isError` tool result.

## Stretch

Add a `power(base, exp)` tool with `outputSchema: { result: number }` and the
same read-only annotations. Keep the factory pattern: register inside
`buildServer`, not at module load.

## Files

- [`server.ts`](server.ts): calculator tools
- [`client.ts`](client.ts): lists tools, drives a short model loop via
  [`../shared/ai-tools.ts`](../shared/ai-tools.ts)
- [`constants.ts`](constants.ts): port

<!-- nav -->

---

Reference: [specification](https://modelcontextprotocol.io/specification/2026-07-28) ·
[schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) ·
[migration](../../docs/migration.md) ·
[threats](../../docs/security.md) ·
[SDK notes](../../docs/sdk-notes.md)

[← index](../../README.md) · [02, Resources →](../02-resources)

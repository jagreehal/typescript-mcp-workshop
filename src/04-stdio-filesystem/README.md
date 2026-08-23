# 04. stdio and the filesystem

A local server over stdin and stdout. The client spawns the process; the
process boundary is the trust boundary.

## You leave able to

- Run an MCP server over stdio without poisoning the protocol stream on stdout
- Contain filesystem paths with resolve-then-check (not string scans for `..`)
- Account for the SDK `auto` probe spawning a short-lived sibling process

## Run

```bash
pnpm example:04
```

One command covers it: the client spawns its own server.

## Concepts

**Process boundary as auth.** No port, no bearer token, no network. Whoever can
spawn the process can call everything it exposes. Local MCP servers for
filesystems, git, and databases ship this way. Host apps (Claude Desktop,
Cursor, VS Code) launch them from config such as:

```json
{
  "mcpServers": {
    "workshop-fs": {
      "command": "pnpm",
      "args": ["tsx", "src/04-stdio-filesystem/server.ts"]
    }
  }
}
```

Paths and package managers vary by host. Keep the idea: spawn command + args,
no URL.

Two things account for most "the server won't start" reports. A host launches
the command from **its own** working directory, not your project, so relative
paths in `args` resolve somewhere you did not expect: use absolute paths, or a
`cwd`. And a host launched from the desktop inherits a minimal `PATH`, so
`pnpm` or `node` installed through a version manager is often not on it: give
the absolute binary path when in doubt.

**Debug it with the Inspector before you debug it in a host.** The Inspector
spawns a stdio server the same way, and shows you the raw exchange:

```bash
pnpm inspect
# transport: stdio
# command: pnpm   args: tsx src/04-stdio-filesystem/server.ts
```

If the tools list is right there and wrong in your host, the problem is the
host's config, not your server.

**Keep stdout clean.** stdout carries the protocol stream. One stray
`console.log` corrupts it. Log to stderr, as this server does. The client
forwards stderr with `stderr: 'inherit'`.

**Path containment.** `resolveWithinRoot` is the security model: resolve the
path, then check containment with `relative()`, before any I/O. The client asks
for `../../../etc/passwd` so you can watch the check refuse it. Scanning the
raw string for `..` fails against symlinks and encodings. Resolve first.

**The `auto` probe spawns a sibling.** On the SDK's stdio transport the
`server/discover` probe runs in a short-lived second process. Some stdio
servers exit on any pre-`initialize` request; the probe must not spend your one
child. Your transport spawns once, after the era is known.

## Try this

1. Run the module. Confirm a normal read inside the root succeeds.
2. Confirm the traversal request is refused before I/O.
3. Add a temporary `console.log` on the server hot path, rerun, and watch the
   client fail to parse the stream. Remove it.

## If it breaks

| Symptom | Likely cause |
|---|---|
| Client JSON parse errors / hung connect | Server wrote to stdout |
| Traversal appears to work | Check skipped resolve, or root set too wide |
| Long stall then legacy fallback | `auto` probe against a server that ignores unknown pre-handshake input; pin era or expose `auto` behind a flag ([module 07](../07-playwright-demo)) |

## Stretch

Add a `listDirectory` tool that returns only entries under the root, with the
same resolve-then-contain check on the directory argument.

## Related

HTTP servers with real auth: [06](../06-auth-api-key),
[09](../09-oauth-authentication). Legacy stdio interop: [07](../07-playwright-demo).

## Files

- [`server.ts`](server.ts): stdio transport + path guard
- [`client.ts`](client.ts): spawns server, exercises tools

<!-- nav -->

---

Reference: [specification](https://modelcontextprotocol.io/specification/2026-07-28) ·
[schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) ·
[migration](../../docs/migration.md) ·
[threats](../../docs/security.md) ·
[SDK notes](../../docs/sdk-notes.md)

[← 03, Prompts](../03-prompts) · [05, Multiple servers →](../05-multi-server)

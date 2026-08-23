# 03. Prompts

Parameterised message templates a user picks: the slash commands in a host UI.

## You leave able to

- Register a prompt with typed arguments and `completable` suggestions
- Avoid the silent `.describe()`-after-`completable` failure
- Keep prompt roles to `user` / `assistant` (MCP has no `system` role)

## Run

```bash
pnpm example:03
```

## Concepts

**A user starts a prompt.** The model chooses a tool. A human chooses a prompt
from a menu. That split is why prompts get argument completion and tools do not.

**Completion.** `completable(schema, callback)` makes an argument
autocompletable. The client calls `completion/complete` while the user types.

> Put `.describe()` **inside** `completable()`. Chain it afterwards and you get
> a fresh schema with no completable marker. The SDK skips registering a
> `completion/complete` handler, and the call dies with `-32601 Method not
> found`. Chaining `.optional()` afterwards is fine: the SDK unwraps optionals
> before it checks.
>
> ```ts
> completable(z.string().describe('Language'), cb).optional()   // works
> completable(z.string(), cb).describe('Language').optional()   // fails, silent
> ```

**No `system` role.** Prompt messages carry `user` or `assistant`. Put
instructions in a user message. An `assistant` message stands for a prior turn.
AI SDK v7 rejects a `system` role inside `messages`, which enforces this.

**The server renders, the client runs.** `prompts/get` returns messages. The
client decides which model consumes them. The server holds no API key.

## Try this

1. List prompts. Open the one this module registers.
2. Trigger completion on a completable argument while typing a prefix.
3. Break the schema on purpose: move `.describe()` outside `completable`,
   restart, and confirm `completion/complete` returns `-32601`.

## Stretch

Add a second prompt with two completable arguments (language and tone). Keep
descriptions inside `completable()`.

## Related

Tools: [module 01](../01-tools-only). Prompt list-change notifications:
[module 13](../13-subscriptions).

## Files

- [`server.ts`](server.ts): prompt + completion handlers
- [`client.ts`](client.ts): getPrompt and a short model run
- [`constants.ts`](constants.ts)

<!-- nav -->

---

Reference: [specification](https://modelcontextprotocol.io/specification/2026-07-28) ·
[schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) ·
[migration](../../docs/migration.md) ·
[threats](../../docs/security.md) ·
[SDK notes](../../docs/sdk-notes.md)

[← 02, Resources](../02-resources) · [04, stdio and the filesystem →](../04-stdio-filesystem)

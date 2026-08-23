import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { generateText, stepCountIs } from 'ai';
import { mcpTools } from '../shared/ai-tools';
import { model } from '../model';

/**
 * A stdio client SPAWNS its server — there is no separate server process to
 * start, which is why this module has a single `pnpm example:04`.
 *
 * On `mode: 'auto'` over the SDK's own stdio transport, the `server/discover`
 * probe runs in a short-lived *sibling* process: some stdio servers exit on any
 * pre-`initialize` request, so the probe must not spend the caller's one child.
 * The real transport spawns once, after the era is known.
 */

const serverPath = fileURLToPath(new URL('server.ts', import.meta.url));
const projectRoot = fileURLToPath(new URL('../..', import.meta.url));

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['tsx', serverPath],
  env: { ...process.env, MCP_FS_ROOT: projectRoot } as Record<string, string>,
  // The server logs to stderr; forward it so you can see it.
  stderr: 'inherit',
});

const client = new Client(
  { name: 'filesystem-client', version: '2.0.0' },
  { versionNegotiation: { mode: 'auto' } },
);

await client.connect(transport);
console.log(`🔌 spawned the server over stdio — protocol era: ${client.getProtocolEra()}\n`);

const tools = await mcpTools(client);
console.log(`🧰 tools: ${Object.keys(tools).join(', ')}\n`);

// The containment check is not decoration — ask for something outside the root.
console.log('🔒 Escape attempt:');
const escape = await client.callTool({ name: 'readFile', arguments: { path: '../../../etc/passwd' } });
console.log(`   isError=${escape.isError} → ${JSON.stringify(escape.content)}\n`);

const { text } = await generateText({
  model,
  tools,
  prompt: 'List the top-level contents of the project root, then read package.json and tell me what the project is for.',
  stopWhen: stepCountIs(15),
});

console.log(`\n🤖 ${text}\n`);

await client.close();

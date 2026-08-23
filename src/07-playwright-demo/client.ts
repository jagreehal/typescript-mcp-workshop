import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { generateText, stepCountIs } from 'ai';
import { mcpTools } from '../shared/ai-tools';
import { model } from '../model';

/**
 * A real third-party server — and the reason `mode: 'auto'` exists.
 *
 * `@playwright/mcp` is built on the v1 SDK, so it speaks 2025-11-25 and knows
 * nothing about `server/discover`. Watch the era this connection reports:
 * `auto` probes, gets no modern evidence back, and falls back to the plain
 * `initialize` handshake — byte-identical to what a 2025 client would send.
 *
 * That fallback is the entire migration story. Your client can adopt
 * 2026-07-28 today without waiting for every server you talk to.
 */

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@playwright/mcp@latest', '--headless', '--isolated'],
});

const client = new Client(
  { name: 'playwright-client', version: '2.0.0' },
  { versionNegotiation: { mode: 'auto' } },
);

await client.connect(transport);

const era = client.getProtocolEra();
console.log(`\n🎭 Playwright MCP connected — protocol era: ${era}`);
console.log(
  era === 'legacy'
    ? '   As expected: a v1-SDK server, so `auto` fell back to the 2025 handshake.\n'
    : '   This server now speaks 2026-07-28.\n',
);

const tools = await mcpTools(client);
console.log(`🧰 ${Object.keys(tools).length} browser tools available\n`);

const { text } = await generateText({
  model,
  tools,
  prompt:
    'Go to https://modelcontextprotocol.io, take a snapshot of the page, and summarise in three bullets what MCP is.',
  stopWhen: stepCountIs(20),
});

console.log(`\n🤖 ${text}\n`);

await client.close();

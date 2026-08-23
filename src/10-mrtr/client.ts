import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { generateText } from 'ai';
import { renderContent } from '../shared/ai-tools';
import { model } from '../model';
import { MCP_URL } from './constants';

/**
 * The client half of MRTR.
 *
 * The elegant part: `callTool()` still returns a plain `CallToolResult`. The
 * extra rounds happen *inside* the call — the SDK sees `input_required`, routes
 * each request to the matching handler below, and retries the original call
 * with the answers attached. Auto-fulfilment is on by default; set
 * `inputRequired: { autoFulfill: false }` to drive the rounds yourself.
 *
 * Note the handler surfaces are still called `elicitation/create` and
 * `sampling/createMessage` — the same names as the 2025 server-initiated
 * requests. What changed is the direction of the plumbing underneath: they are
 * answers to a returned result now, not replies on a held-open stream.
 */

const client = new Client(
  { name: 'mrtr-client', version: '2.0.0' },
  {
    versionNegotiation: { mode: { pin: '2026-07-28' } },
    // A client must declare the capability for its handler to be accepted.
    capabilities: { elicitation: {}, sampling: {} },
  },
);

// Stands in for a UI prompt. A real host renders `requestedSchema` as a form
// and waits for a human — which is exactly why this must not block a stream.
client.setRequestHandler('elicitation/create', async (request) => {
  const params = request.params as { message?: string };
  console.log(`\n   💬 server asks: ${params.message}`);

  const answer = scriptedAnswers.shift();
  console.log(`   👤 user answers: ${JSON.stringify(answer)}`);
  return { action: 'accept', content: answer ?? {} };
});

// The client owns the model — that is the whole point of sampling. The server
// asked for a completion without ever holding an API key.
client.setRequestHandler('sampling/createMessage', async (request) => {
  const params = request.params as { messages: { content: { type: string; text?: string } }[] };
  const prompt = params.messages.map((message) => message.content.text ?? '').join('\n');
  console.log(`\n   🧠 server asks the CLIENT's model: ${prompt.slice(0, 70)}…`);

  const { text } = await generateText({ model, prompt });
  return {
    model: 'client-side-model',
    role: 'assistant' as const,
    content: { type: 'text' as const, text },
  };
});

/** Elicitation answers are flat primitives on the wire, not arbitrary JSON. */
const scriptedAnswers: Record<string, string | number | boolean | string[]>[] = [
  { confirm: false }, // deploy to production — declined
  { confirm: true }, // deploy to staging — approved
  { address: '221B Baker Street, London' }, // sendGift round 1
];

await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)));
console.log(`🔌 connected — protocol era: ${client.getProtocolEra()}`);

console.log('\n1️⃣  deploy to production (the user says no)');
const declined = await client.callTool({ name: 'deploy', arguments: { env: 'production' } });
console.log(`   → ${renderContent(declined.content)}`);

console.log('\n2️⃣  deploy to staging (the user says yes)');
const approved = await client.callTool({ name: 'deploy', arguments: { env: 'staging' } });
console.log(`   → ${renderContent(approved.content)}`);

console.log('\n3️⃣  sendGift — two rounds: an elicitation, then a sampling call');
const gift = await client.callTool({
  name: 'sendGift',
  arguments: { recipient: 'Ada', occasion: 'birthday' },
});
console.log(`\n   → ${renderContent(gift.content)}`);

console.log('\n   One `callTool` from the caller\'s point of view. Three HTTP exchanges');
console.log('   on the wire, each independently routable. No stream stayed open.\n');

await client.close();

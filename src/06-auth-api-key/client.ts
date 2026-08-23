import { renderContent } from '../shared/ai-tools';
import { connectWhenReady } from '../shared/connect';
import { ALICE_API_KEY, BOB_API_KEY, MCP_URL } from './constants';

/** Three callers, three outcomes: no key, a read-only key, a read+write key. */

console.log('\n1️⃣  No key at all');
try {
  await connectWhenReady(MCP_URL, { attempts: 3 });
  console.log('   ⚠️  connected without a key — that would be the bug');
} catch (error) {
  console.log(`   rejected: ${error instanceof Error ? error.message : String(error)}`);
}

console.log('\n2️⃣  Alice (read only)');
const alice = await connectWhenReady(MCP_URL, {
  headers: { Authorization: `Bearer ${ALICE_API_KEY}` },
});
await report(alice, 'listNotes', {});
await report(alice, 'addNote', { text: 'Alice was here' }); // denied: no write scope
await alice.close();

console.log('\n3️⃣  Bob (read + write)');
const bob = await connectWhenReady(MCP_URL, {
  headers: { Authorization: `Bearer ${BOB_API_KEY}` },
});
await report(bob, 'whoami', {});
await report(bob, 'addNote', { text: 'Ship the workshop' });
await report(bob, 'addNote', { text: 'Then take a break' });
await report(bob, 'listNotes', {});
await bob.close();

console.log('\n4️⃣  Bob cannot see Alice\'s notes and vice versa — each request builds');
console.log('    a fresh server instance closed over exactly one verified caller.\n');

async function report(
  client: Awaited<ReturnType<typeof connectWhenReady>>,
  name: string,
  args: Record<string, unknown>,
): Promise<void> {
  const result = await client.callTool({ name, arguments: args });
  const marker = result.isError ? '⛔' : '✅';
  console.log(`   ${marker} ${name}: ${renderContent(result.content)}`);
}

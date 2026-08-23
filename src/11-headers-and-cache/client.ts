import { renderContent } from '../shared/ai-tools';
import { connectWhenReady } from '../shared/connect';
import { MCP_URL } from './constants';

/**
 * Everything below goes through the gateway, which only ever reads two headers.
 */

const client = await connectWhenReady(MCP_URL, { era: { pin: '2026-07-28' } });

// ---- Cacheable lists -------------------------------------------------------

console.log('\n📋 tools/list, twice');
const first = Date.now();
const listing = await client.listTools();
console.log(`   cold: ${Date.now() - first}ms — ${listing.tools.length} tools`);
console.log(`   hint: ttlMs=${listing.ttlMs ?? 0} scope=${listing.cacheScope ?? 'private'}`);
console.log(`   order: ${listing.tools.map((tool) => tool.name).join(', ')}`);

const second = Date.now();
await client.listTools();
console.log(`   warm: ${Date.now() - second}ms — served from the client cache, no round trip`);
console.log('   (the gateway log shows only ONE tools/list reaching the server)');

console.log('\n   Deterministic order is not cosmetic: it is what keeps the serialised');
console.log('   tool block at the head of your model prompt byte-stable, so the');
console.log("   provider's prompt cache survives a reconnect.");

// ---- Header routing --------------------------------------------------------

console.log('\n🏷️  Every request below carries Mcp-Method and Mcp-Name.');
console.log('   Watch the gateway terminal — it blocks and meters from those alone.\n');

console.log('🔎 A few searches:');
for (const query of ['otters', 'espresso', 'mcp']) {
  const result = await client.callTool({ name: 'search', arguments: { query } });
  console.log(`   ${renderContent(result.content)}`);
}

console.log('\n🏢 tenant_report — its `tenantId` argument travels as a header too');
console.log('   (the client mirrors it from the tool definition; nothing here says "header")');
for (const [tenantId, month] of [
  ['acme', '2026-06'],
  ['acme', '2026-07'],
  ['acme', '2026-08'],
  ['globex', '2026-07'],
] as const) {
  try {
    const result = await client.callTool({ name: 'tenant_report', arguments: { tenantId, month } });
    console.log(`   ${renderContent(result.content)}`);
  } catch (error) {
    console.log(`   ${tenantId}/${month}: ${message(error)}`);
  }
}

console.log('\n💣 A tool the gateway blocks by name:');
try {
  await client.callTool({ name: 'drop_database', arguments: { name: 'production' } });
  console.log('   ⚠️  it went through — the gateway failed');
} catch (error) {
  console.log(`   blocked before the server saw it: ${message(error)}`);
}

console.log('\n⏱️  Exhausting the tools/call budget (9):');
for (let attempt = 1; attempt <= 4; attempt++) {
  try {
    const result = await client.callTool({ name: 'expensive_report', arguments: { month: `2026-0${attempt}` } });
    console.log(`   ${attempt}. ${renderContent(result.content)}`);
  } catch (error) {
    console.log(`   ${attempt}. rate limited: ${message(error)}`);
  }
}

console.log('\n   None of that needed a JSON-RPC parser in the gateway.\n');

await client.close();

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

import { renderContent } from '../shared/ai-tools';
import { connectWhenReady } from '../shared/connect';
import { MCP_URL } from './constants';

/**
 * One "conversation", served by alternating backends.
 *
 * Under 2025 this could not work: the session was established by `initialize`
 * against one instance, and every later request had to come back to it (or to
 * a shared session store). Under 2026-07-28 every request is self-describing,
 * so the balancer can send each one wherever it likes.
 */

// Pin the era: refuse to silently fall back. If this server were a 2025 server,
// connect() would reject with SdkError(EraNegotiationFailed) rather than
// quietly giving us a session-based connection.
const client = await connectWhenReady(MCP_URL, { era: { pin: '2026-07-28' } });

// The optional capability probe. A client that wants the catalog up front asks
// for it explicitly — it is no longer forced on every connection as a handshake.
console.log('\n🔎 server/discover:');
const discovered = await client.listTools();
console.log(`   tools: ${discovered.tools.map((tool) => tool.name).join(', ')}`);
console.log(`   cache: ttlMs=${discovered.ttlMs ?? 0} scope=${discovered.cacheScope ?? 'private'}`);

console.log('\n📍 Six calls, one connection — watch the instance change:');
for (let call = 1; call <= 6; call++) {
  const result = await client.callTool({ name: 'whereAmI', arguments: {} });
  console.log(`   call ${call}: ${renderContent(result.content)}`);
}

console.log('\n🛒 State without a session — an explicit handle the model can see:');
const started = await client.callTool({ name: 'startCart', arguments: {} });
const handle = renderContent(started.content).match(/cart_[a-z0-9]+/)?.[0];
console.log(`   ${renderContent(started.content)}`);

if (handle) {
  for (const item of ['espresso machine', 'burr grinder', 'scales']) {
    const added = await client.callTool({ name: 'addItem', arguments: { cartId: handle, item } });
    console.log(`   ${renderContent(added.content)}`);
  }
  const view = await client.callTool({ name: 'viewCart', arguments: { cartId: handle } });
  console.log(`   ${renderContent(view.content)}`);
  console.log('\n   Each of those landed on a different instance. The cart survived because');
  console.log('   the handle travelled in the arguments, not in a session header.\n');
}

await client.close();

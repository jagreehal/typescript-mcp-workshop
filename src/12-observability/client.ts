import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { instrumentMcpClient } from 'autotel-mcp-instrumentation/client';
import { renderContent } from '../shared/ai-tools';
import { initTelemetry, TELEMETRY_CONFIG } from '../shared/otel';
import { MCP_URL } from './constants';

/**
 * The other half of the trace.
 *
 * `instrumentMcpClient` wraps `callTool` so each call opens a span and injects
 * `traceparent` into the outgoing `_meta`. The server picks it up and makes its
 * tool span a child of this one — so a single trace spans both processes, over
 * a protocol with no session tying them together.
 */
initTelemetry('workshop-mcp-client');

const client = new Client(
  { name: 'observable-client', version: '2.0.0' },
  { versionNegotiation: { mode: 'auto' } },
);

const traced = instrumentMcpClient(client, TELEMETRY_CONFIG);

await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)));
console.log(`🔌 connected — protocol era: ${client.getProtocolEra()}\n`);

console.log('📞 Calls (each one is a distributed trace, client span → server span):');

for (const orderId of ['ord_1001', 'ord_1002']) {
  const result = await traced.callTool({ name: 'lookupOrder', arguments: { orderId } });
  console.log(`   lookupOrder(${orderId}) → ${renderContent(result.content)}`);
}

console.log('\n   flakyTool ×6 — some of these become error spans:');
for (let attempt = 1; attempt <= 6; attempt++) {
  const result = await traced.callTool({ name: 'flakyTool', arguments: {} });
  console.log(`   ${attempt}. ${result.isError ? '⛔' : '✅'} ${renderContent(result.content)}`);
}

console.log('\n   slowTool — the one that shows up in a latency histogram:');
const started = Date.now();
const slow = await traced.callTool({ name: 'slowTool', arguments: {} });
console.log(`   ${renderContent(slow.content)} (${Date.now() - started}ms)`);

console.log('\n📊 With a collector running you now have one trace per call, spanning');
console.log('   both processes. Without one, the SDK buffers and drops — nothing breaks.');
console.log('   Try: pnpm dlx autotel-devtools — then open http://localhost:4318\n');

await client.close();

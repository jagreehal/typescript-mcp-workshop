import { connectWhenReady } from '../shared/connect';
import { BUILD_STATUS_URI, MCP_URL } from './constants';

/**
 * The client half of `subscriptions/listen`.
 *
 * `listen(filter)` opens the stream and resolves once the server's
 * `notifications/subscriptions/acknowledged` comes back. Everything arriving
 * on it dispatches to the ordinary `setNotificationHandler` registrations —
 * the same handlers a 2025 connection fired for unsolicited notifications. So
 * consumer code is era-transparent; only the opt-in is new.
 */

const client = await connectWhenReady(MCP_URL, { era: { pin: '2026-07-28' } });

let published = false;

client.setNotificationHandler('notifications/tools/list_changed', async () => {
  const { tools } = await client.listTools();
  console.log(`\n📢 tools/list_changed → ${tools.map((tool) => tool.name).join(', ')}`);
  published = true;
});

client.setNotificationHandler('notifications/resources/updated', async (notification) => {
  const { uri } = notification.params;
  const { contents } = await client.readResource({ uri });
  const body = contents[0] && 'text' in contents[0] ? contents[0].text : '(binary)';
  console.log(`📢 resources/updated ${uri} → ${body}`);
  // Every notification on the stream is stamped with the subscription that
  // asked for it, so a client running several streams can tell them apart.
  console.log(`   subscriptionId: ${notification.params._meta?.['io.modelcontextprotocol/subscriptionId']}`);
});

console.log('\n📡 Opening subscriptions/listen');
const subscription = await client.listen({
  toolsListChanged: true,
  resourceSubscriptions: [BUILD_STATUS_URI],
  // Asked for, but this server advertises no prompts capability. Watch it fall
  // out of the acknowledged filter rather than silently never firing.
  promptsListChanged: true,
});

console.log(`   asked for:  toolsListChanged, promptsListChanged, ${BUILD_STATUS_URI}`);
console.log(`   honoured:   ${JSON.stringify(subscription.honoredFilter)}`);
console.log('\n   Now waiting. Note what does NOT arrive: build://log updates every');
console.log('   stage too, and it was not in the filter.\n');

// Watch the build through. The stream stays open; no polling happens here.
await Promise.race([
  new Promise<void>((resolve) => {
    const poll = setInterval(() => {
      if (published) {
        clearInterval(poll);
        resolve();
      }
    }, 100);
  }),
  new Promise<void>((resolve) => setTimeout(resolve, 15_000)),
]);

// Request-scoped notifications, for contrast. Nothing below touches the
// subscription: progress rides the response stream of the call that asked
// for it, and would work identically with no subscription open at all.
console.log('\n📊 tools/call collect_logs, with progress');
await client.callTool(
  { name: 'collect_logs', arguments: { lines: 4 } },
  {
    onprogress: ({ progress, total, message }) => {
      console.log(`   ${progress}/${total} ${message ?? ''}`);
    },
  },
);

console.log('\n✂️  The same call, cancelled halfway');
const abort = new AbortController();
setTimeout(() => abort.abort(), 700);
try {
  await client.callTool({ name: 'collect_logs', arguments: { lines: 20 } }, { signal: abort.signal });
} catch (error) {
  // The client raises locally, and sends `notifications/cancelled` so the
  // server can stop working. Stopping stays cooperative: the server
  // acknowledges but is never obliged to abandon work already in flight.
  console.log(`   client saw: ${error instanceof Error ? error.name : String(error)}`);
  console.log('   server log shows where its handler noticed the signal.');
}

console.log('\n🔻 Closing the subscription');
await subscription.close();
// 'local' — we closed it. 'graceful' is the server ending it deliberately;
// 'remote' is the stream dropping, and means re-listen if you still want events.
console.log(`   ended: ${await subscription.closed}`);

console.log('\n   One long POST for change events. Every other request in this');
console.log('   process stayed independently routable.\n');

await client.close();

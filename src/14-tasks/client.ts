import { connectWhenReady } from '../shared/connect';
import { renderContent } from '../shared/ai-tools';
import { MCP_URL, POLL_INTERVAL_MS } from './constants';

/**
 * The client half: start work, poll a handle, honour the terminal states.
 *
 * Every request below is independent. Nothing here holds a connection open,
 * and nothing here would care if each poll landed on a different instance.
 */

const client = await connectWhenReady(MCP_URL, { era: { pin: '2026-07-28' } });

type StartResult = { jobId: string; status: string; pollAfterMs: number };
type StatusResult = { status: string; statusMessage: string; result?: string; error?: string };

async function start(orderId: string, amount: number): Promise<StartResult> {
  const call = await client.callTool({ name: 'startRefund', arguments: { orderId, amount } });
  console.log(`   ${renderContent(call.content)}`);
  return call.structuredContent as StartResult;
}

/** Poll to a terminal state, respecting the interval the server asked for. */
async function poll(jobId: string, pollAfterMs: number): Promise<StatusResult> {
  for (let attempt = 1; attempt <= 20; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollAfterMs));
    const call = await client.callTool({ name: 'refund_status', arguments: { jobId } });
    const status = call.structuredContent as StatusResult;
    console.log(`   poll ${attempt}: ${status.status} — ${status.statusMessage}`);
    if (status.status !== 'working') return status;
  }
  throw new Error(`${jobId} never settled`);
}

console.log('\n1️⃣  A refund that settles');
const ok = await start('ord_1001', 42);
const okFinal = await poll(ok.jobId, ok.pollAfterMs);
console.log(`   → ${okFinal.result}`);

console.log('\n2️⃣  A refund that fails — a terminal state, not an exception');
const bad = await start('ord_1002', 900);
const badFinal = await poll(bad.jobId, bad.pollAfterMs);
console.log(`   → failed: ${badFinal.error}`);

console.log('\n3️⃣  Cancelling one in flight (cooperative — it may finish anyway)');
const doomed = await start('ord_1003', 17);
await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
const cancelled = await client.callTool({
  name: 'cancel_refund',
  arguments: { jobId: doomed.jobId },
});
console.log(`   ${renderContent(cancelled.content)}`);
const after = await client.callTool({ name: 'refund_status', arguments: { jobId: doomed.jobId } });
console.log(`   → ${renderContent(after.content)}`);

console.log('\n4️⃣  Two jobs at once — nothing is serialised by a connection');
const [a, b] = await Promise.all([start('ord_1004', 5), start('ord_1005', 7)]);
const [ra, rb] = await Promise.all([poll(a.jobId, a.pollAfterMs), poll(b.jobId, b.pollAfterMs)]);
console.log(`   → ${ra.result} / ${rb.result}`);

console.log('\n   Every one of those was an independent HTTP request. No stream stayed');
console.log('   open, no session pinned the polls to the instance that started the job.\n');

await client.close();

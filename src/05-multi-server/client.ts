import { generateText, stepCountIs } from 'ai';
import { mcpToolsFrom } from '../shared/ai-tools';
import { connectWhenReady } from '../shared/connect';
import { model } from '../model';
import { PAYMENT_SERVER_URL, USER_SERVER_URL } from './constants';

/**
 * One agent, two servers. Neither server knows the other exists — the model is
 * what joins them: "look up Bob's ID on the user service, then ask the payment
 * service for that ID's balance."
 *
 * Prefixing tool names per server is the whole trick. Two servers will
 * eventually both export a `search`, and a flat namespace makes that a silent
 * wrong-server call.
 */

const [userClient, paymentClient] = await Promise.all([
  connectWhenReady(USER_SERVER_URL),
  connectWhenReady(PAYMENT_SERVER_URL),
]);

const tools = await mcpToolsFrom({ users: userClient, payments: paymentClient });
console.log(`\n🧰 combined catalog: ${Object.keys(tools).join(', ')}\n`);

const tasks = [
  "What is Bob's balance? Look up his ID by email first (bob@example.com).",
  'Transfer 250 from alice@example.com to charlie@example.com, then report both balances.',
  'Try to transfer 99999 from charlie@example.com to bob@example.com and tell me what happened.',
];

for (const prompt of tasks) {
  console.log(`Q: ${prompt}`);
  const { text, steps } = await generateText({
    model,
    tools,
    prompt,
    stopWhen: stepCountIs(15),
  });
  const called = steps
    .flatMap((step) => step.toolCalls)
    .map((call) => call.toolName)
    .join(' → ');
  console.log(`   calls: ${called || '(none)'}`);
  console.log(`A: ${text}\n`);
}

await Promise.all([userClient.close(), paymentClient.close()]);

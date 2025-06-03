import {
  experimental_createMCPClient as createMCPClient,
  generateText,
} from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';

import { USER_SERVER_PORT, PAYMENT_SERVER_PORT } from './constants';
import { groqModel as model } from '../model';

// Create MCP clients for both servers
const userUrl = new URL(`http://localhost:${USER_SERVER_PORT}/stream`);
const userClient = await createMCPClient({
  transport: new StreamableHTTPClientTransport(userUrl),
});

const paymentUrl = new URL(`http://localhost:${PAYMENT_SERVER_PORT}/stream`);
const paymentClient = await createMCPClient({
  transport: new StreamableHTTPClientTransport(paymentUrl),
});

async function main() {
  // Get tools from both servers
  const userTools = await userClient.tools();
  const paymentTools = await paymentClient.tools();

  console.log('=== Available User Tools ===');
  console.dir(userTools, { depth: null });

  console.log('\n=== Available Payment Tools ===');
  console.dir(paymentTools, { depth: null });

  const allTools = { ...userTools, ...paymentTools };

  const emails = [
    'bob@example.com',
    'alice@example.com',
    'charlie@example.com',
  ];

  for (const email of emails) {
    const result = await generateText({
      model,
      tools: allTools,
      prompt: `What are the recent transactions for ${email}?`,
      maxSteps: 50,
    });
    console.log(`\n=== Transactions for ${email} ===`);
    console.log(result.text);
  }

  await Promise.all([userClient.close(), paymentClient.close()]);
}

main().catch(console.error);

import {
  experimental_createMCPClient as createMCPClient,
  generateText,
} from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';

import { USER_SERVER_PORT, PAYMENT_SERVER_PORT } from './constants';
import { model } from '../model';

// Create MCP clients for both servers
const userUrl = new URL(`http://localhost:${USER_SERVER_PORT}/stream`);
const userClient = await createMCPClient({
  transport: new StreamableHTTPClientTransport(userUrl),
});

const paymentUrl = new URL(`http://localhost:${PAYMENT_SERVER_PORT}/stream`);
const paymentClient = await createMCPClient({
  transport: new StreamableHTTPClientTransport(paymentUrl),
});

// Get tools from both servers
const userTools = await userClient.tools();
const paymentTools = await paymentClient.tools();

console.log('=== Available User Tools ===');
console.dir(userTools, { depth: null });

console.log('\n=== Available Payment Tools ===');
console.dir(paymentTools, { depth: null });

// Combine tools from both servers
const allTools = { ...userTools, ...paymentTools };

// Demo: Ask the LLM to get user info and latest transactions for Bob
const result = await generateText({
  model,
  tools: allTools,
  prompt: `
    Please help me get information about Bob's financial activity:

    1. First, get Bob's user information
    2. Then, get Bob's 3 most recent transactions
    3. Summarize the findings in a clear, organized way
  `,
  maxSteps: 30,
});

// Close both clients
await userClient.close();
await paymentClient.close();

console.log('\n=== Demo Results ===');
console.log(result.text);
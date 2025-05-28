import {
  experimental_createMCPClient as createMCPClient,
  generateText,
  type ToolSet
} from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';
import { model } from '../model';
import { BOB_API_KEY, ALICE_API_KEY, PORT } from './constants';


async function createClient(apiKey: string) {
  const dbUrl = new URL(`http://localhost:${PORT}/stream`);
  return await createMCPClient({
    transport: new StreamableHTTPClientTransport(dbUrl, {
      requestInit: {
        headers: {
          'x-api-key': apiKey
        }
      }
    }),
  });
}

async function runQuery(client: { tools: () => Promise<ToolSet>; close: () => void }, question: string) {
  const tools = await client.tools();
  const result = await generateText({
    model,
    tools,
    messages: [
      {
        role: 'user',
        content: question
      }
    ],
    maxSteps: 20,
  });

  console.log(result.text);
}

async function main() {
  console.log('🔐 Testing with different API keys:\n');

  // Test Bob's access
  console.log('=== Testing Bob\'s Access ===\n');
  const bobClient = await createClient(BOB_API_KEY);
  await runQuery(bobClient, 'Show me my account balance.');
  await runQuery(bobClient, 'Show me my recent transactions.');
  await runQuery(bobClient, 'List all my transactions with amounts and descriptions.');
  bobClient.close();

  // Test Alice's access
  console.log('\n=== Testing Alice\'s Access ===\n');
  const aliceClient = await createClient(ALICE_API_KEY);
  await runQuery(aliceClient, 'Show me my account balance.');
  await runQuery(aliceClient, 'Show me my recent transactions.');
  await runQuery(aliceClient, 'List all my transactions with amounts and descriptions.');
  aliceClient.close();
}

main().catch(console.error);
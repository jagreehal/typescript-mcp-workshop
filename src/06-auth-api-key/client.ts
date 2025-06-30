import {
  experimental_createMCPClient as createMCPClient,
  generateText,
} from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';
import { model } from '../model';
import { BOB_API_KEY, ALICE_API_KEY, PORT } from './constants';

async function createClient(apiKey: string) {
  const dbUrl = new URL(`http://localhost:${PORT}/mcp`);
  return await createMCPClient({
    transport: new StreamableHTTPClientTransport(dbUrl, {
      requestInit: {
        headers: {
          'x-api-key': apiKey,
        },
      },
    }),
  });
}

// Define a type for the client returned by createClient
type MCPClient = Awaited<ReturnType<typeof createClient>>;

async function runQuery(client: MCPClient, question: string) {
  try {
    const tools = await client.tools();
    const result = await generateText({
      model,
      tools,
      messages: [
        {
          role: 'user',
          content: question,
        },
      ],
      maxSteps: 20,
    });

    if (result.text) {
      console.log(result.text);
    } else {
      console.error('Error: No text in result');
      if (result.toolCalls && result.toolCalls.length > 0) {
        result.toolCalls.forEach((tc) => {
          if (typeof tc === 'object' && tc !== null && 'result' in tc) {
            const toolCallResult = (
              tc as { result?: { type?: string; error?: { message: string } } }
            ).result;
            if (
              toolCallResult &&
              toolCallResult.type === 'error' &&
              toolCallResult.error
            ) {
              console.error(
                `Tool call error (${tc.toolName}): ${toolCallResult.error.message}`,
              );
            }
          }
        });
      }
      // Potentially log more details from result if needed
    }
  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error(`Error during query for "${question}":`, errorMessage);
    // Check for a 'cause' property, which might not be standard
    if (typeof error === 'object' && error !== null && 'cause' in error) {
      console.error('Cause:', (error as { cause: unknown }).cause);
    }
  }
}

async function main() {
  console.log('🔐 Testing with different API keys:\n');

  // Test Bob's access
  console.log("=== Testing Bob's Access ===\n");
  const bobClient = await createClient(BOB_API_KEY);
  await runQuery(bobClient, 'Show me my account balance.');
  await runQuery(bobClient, 'Show me my recent transactions.');
  await runQuery(
    bobClient,
    'List all my transactions with amounts and descriptions.',
  );
  bobClient.close();

  // Test Alice's access
  console.log("\n=== Testing Alice's Access ===\n");
  const aliceClient = await createClient(ALICE_API_KEY);
  await runQuery(aliceClient, 'Show me my account balance.');
  await runQuery(aliceClient, 'Show me my recent transactions.');
  await runQuery(
    aliceClient,
    'List all my transactions with amounts and descriptions.',
  );
  aliceClient.close();
}

main().catch(console.error);

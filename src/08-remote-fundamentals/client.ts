import { model } from '../model';
import {
  experimental_createMCPClient as createMCPClient,
  generateText,
} from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';
import { PORT } from './constants';

async function testRemoteServer() {
  try {
    console.log('🔌 Connecting to remote MCP server...');

    // Create MCP client with HTTP transport
    const url = new URL(`http://localhost:${PORT}/mcp`);
    const mcpClient = await createMCPClient({
      transport: new StreamableHTTPClientTransport(url),
    });

    console.log('✅ Connected successfully!');

    // Get available tools
    console.log('\n🔧 Available tools:');
    const tools = await mcpClient.tools();
    console.log('Tools:', Object.keys(tools).join(', '));

    // Test basic calculations using AI model
    console.log('\n🧮 Testing calculations with AI integration...');

    const calculations = [
      'What is 15 plus 25?',
      'What is 7 multiplied by 8?',
      'Show me my calculation history (limit 5)',
      'Set my preferences to 3 decimal places with history enabled',
      'What is 1 plus 3 with the new precision settings?',
      'Show me the server statistics',
    ];

    for (const prompt of calculations) {
      console.log(`\n❓ Question: ${prompt}`);
      try {
        const result = await generateText({
          model,
          tools,
          prompt,
          maxSteps: 10,
        });
        console.log(`✅ Answer: ${result.text}`);
      } catch (error) {
        console.log(
          `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Close the connection
    console.log('\n🔌 Disconnecting from remote server...');
    await mcpClient.close();
    console.log('✅ Disconnected successfully!');
  } catch (error) {
    console.error('❌ Error testing remote server:', error);
  }
}

// Handle command line arguments for session ID
const args = process.argv.slice(2);
const sessionIdArg = args.find((arg) => arg.startsWith('--session-id='));
const sessionId = sessionIdArg ? sessionIdArg.split('=')[1] : undefined;

if (sessionId) {
  console.log(`🏷️ Using session ID: ${sessionId}`);
  // Note: Session ID would be passed via headers in a real implementation
}

console.log('🚀 Starting remote MCP client test...');
testRemoteServer().catch(console.error);

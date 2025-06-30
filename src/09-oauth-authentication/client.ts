import { model } from '../model';
import {
  experimental_createMCPClient as createMCPClient,
  generateText,
} from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';

const PORT = 3009;

async function testOAuthServer() {
  let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;

  try {
    console.log('🚀 Starting OAuth 2.1 MCP server test...');
    console.log('🔌 Connecting to OAuth MCP server...');

    // Create MCP client
    const url = new URL(`http://localhost:${PORT}/mcp`);
    mcpClient = await createMCPClient({
      transport: new StreamableHTTPClientTransport(url),
    });

    console.log('✅ Connected successfully!');

    // Get available tools
    const tools = await mcpClient.tools();
    console.log('\n🔧 Available OAuth tools:');
    console.log('Tools:', Object.keys(tools).join(', '));

    // Test 1: Generate PKCE parameters
    console.log('\n🔐 Testing PKCE generation...');
    const pkceResult = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: 'Generate PKCE parameters for OAuth flow',
        },
      ],
      tools: {
        generatePKCE: tools.generatePKCE!,
      },
      toolChoice: 'required',
    });

    console.log('PKCE Generation Result:');
    console.log(pkceResult.text);

    // Test 2: Get OAuth discovery information
    console.log('\n🔍 Testing OAuth discovery...');
    const discoveryResult = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: 'Get OAuth 2.1 discovery information',
        },
      ],
      tools: {
        getOAuthDiscovery: tools.getOAuthDiscovery!,
      },
      toolChoice: 'required',
    });

    console.log('OAuth Discovery Result:');
    console.log(discoveryResult.text);

    // Test 3: Register a new OAuth client
    console.log('\n📝 Testing client registration...');
    const registerResult = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content:
            'Register an OAuth client named "Test Client" with redirect URI "http://localhost:3000/callback" and read scope',
        },
      ],
      tools: {
        registerOAuthClient: tools.registerOAuthClient!,
      },
      toolChoice: 'required',
    });

    console.log('Client Registration Result:');
    console.log(registerResult.text);

    console.log('\n🎉 OAuth 2.1 MCP server test completed successfully!');
    console.log('\n📋 What was tested:');
    console.log('   ✅ Server connectivity');
    console.log('   ✅ PKCE parameter generation');
    console.log('   ✅ OAuth discovery endpoint');
    console.log('   ✅ Dynamic client registration');

    console.log('\n🔐 OAuth 2.1 features available:');
    console.log('   • PKCE code challenge/verifier generation');
    console.log('   • OAuth 2.1 discovery metadata');
    console.log('   • Dynamic client registration (RFC 7591)');
    console.log('   • Authorization code flow (in server)');
    console.log('   • Token introspection (RFC 7662)');
    console.log('   • Token revocation (RFC 7009)');
  } catch (error) {
    console.log(
      `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    // Clean up: close the MCP client connection
    if (mcpClient) {
      try {
        await mcpClient.close();
        console.log('\n🔌 Connection closed');
      } catch (closeError) {
        console.log('⚠️  Error closing connection:', closeError);
      }
    }
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(0);
  }
}

// Run the OAuth test
testOAuthServer().catch(console.error);

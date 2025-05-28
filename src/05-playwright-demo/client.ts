import {
  experimental_createMCPClient as createMCPClient,
  generateText,
} from 'ai';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import { model } from '../model';

async function main() {
  console.log('🎭 Using Playwright MCP to visit example.com\n');

  try {
    // Create MCP client for Playwright server
    console.log('Creating Playwright MCP client...');
    const playwrightClient = await createMCPClient({
      transport: new StdioClientTransport({
        command: 'npx',
        args: ['@playwright/mcp@latest'],
      }),
    });

    console.log('Connected to Playwright MCP server ✓');

    // Get available tools
    console.log('Getting available tools...');
    const tools = await playwrightClient.tools();

    console.log('=== Available Playwright Tools ===');
    console.dir(tools, { depth: null });

    // Use the AI model to navigate to bbc.co.uk
    console.log('\n=== Visiting page ===\n');

    const result = await generateText({
      model,
      tools,
      prompt: `
        Navigate to bbc.co.uk and provide a summary of what you see on the page
      `,
      maxSteps: 15,
    });

    console.log('=== Result ===');
    console.log(result.text);

    // Close the client
    await playwrightClient.close();
    console.log('\nPlaywright MCP client closed ✓');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);

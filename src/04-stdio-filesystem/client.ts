import {
  experimental_createMCPClient as createMCPClient,
  generateText,
} from 'ai';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import { model } from '../model';

const mcpClient = await createMCPClient({
  transport: new StdioClientTransport({
    command: 'npx',
    args: ['tsx', 'src/04-stdio-filesystem/server.ts'],
  }),
});

const tools = await mcpClient.tools();

console.dir(tools, { depth: null });

const result = await generateText({
  model,
  tools,
  prompt: `
    Please summarize the contents of the directory '/Users/jreehal/dev/ai/typescript-mcp-workshop'
  `,
  maxSteps: 15,
});

await mcpClient.close();

console.log('\n=== Demo Results ===');
console.log(result.text);

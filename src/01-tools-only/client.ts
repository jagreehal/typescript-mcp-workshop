import { model } from '../model';
import {
  experimental_createMCPClient as createMCPClient,
  generateText,
} from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';
import { PORT } from './constants';

const url = new URL(`http://localhost:${PORT}/mcp`);
const mcpClient = await createMCPClient({
  transport: new StreamableHTTPClientTransport(url),
});

const tools = await mcpClient.tools();
console.dir(tools, { depth: null });

const calculations = [
  'What is 25 plus 15?',
  'What is 50 minus 30?',
  'What is 8 multiplied by 6?',
  'What is 100 divided by 4?',
  'What happens if I try to divide by zero?',
  'Can you show me a series of calculations? First multiply 5 and 3, then add 10 to the result.',
];

console.log('🧮 Testing Calculator Operations:\n');

for (const prompt of calculations) {
  console.log(`Question: ${prompt}`);
  const result = await generateText({
    model,
    tools,
    prompt,
    maxSteps: 10,
  });
  console.log(`Answer: ${result.text}\n`);
}

await mcpClient.close();

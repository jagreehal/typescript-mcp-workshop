import { generateText, stepCountIs } from 'ai';
import { mcpTools } from '../shared/ai-tools';
import { connectWhenReady } from '../shared/connect';
import { model } from '../model';
import { MCP_URL } from './constants';

const client = await connectWhenReady(MCP_URL);

// One `tools/list`, mapped to AI SDK tools. The mapping is 20 lines in
// src/shared/ai-tools.ts — worth reading once, because it is the entire
// "MCP tools in an agent" story.
const tools = await mcpTools(client);
console.log(`🧰 tools: ${Object.keys(tools).join(', ')}\n`);

const questions = [
  'What is 25 plus 15?',
  'What is 50 minus 30?',
  'What is 8 multiplied by 6?',
  'What is 100 divided by 4?',
  'What happens if I try to divide by zero?',
  'First multiply 5 and 3, then add 10 to the result.',
];

for (const prompt of questions) {
  console.log(`Q: ${prompt}`);
  const { text } = await generateText({
    model,
    tools,
    prompt,
    // Multi-step: the model calls a tool, reads the result, and may call again.
    stopWhen: stepCountIs(10),
  });
  console.log(`A: ${text}\n`);
}

await client.close();

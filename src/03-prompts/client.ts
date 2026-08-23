import { generateText } from 'ai';
import { connectWhenReady } from '../shared/connect';
import { model } from '../model';
import { MCP_URL } from './constants';

const client = await connectWhenReady(MCP_URL);

const { prompts } = await client.listPrompts();
console.log(`\n📝 ${prompts.length} prompts:`);
for (const prompt of prompts) {
  const args = (prompt.arguments ?? [])
    .map((argument) => (argument.required ? argument.name : `${argument.name}?`))
    .join(', ');
  console.log(`   ${prompt.name.padEnd(18)} (${args})`);
}

// Argument completion — what a client calls while the user is still typing.
console.log('\n⌨️  Completion for code_review.language starting with "t":');
const completion = await client.complete({
  ref: { type: 'ref/prompt', name: 'code_review' },
  argument: { name: 'language', value: 't' },
});
console.log(`   ${completion.completion.values.join(', ')}`);

// Fetch a prompt: the server renders the template, the client owns the model.
console.log('\n🎯 Fetching code_review and running it:\n');
const { messages, description } = await client.getPrompt({
  name: 'code_review',
  arguments: {
    language: 'typescript',
    code: 'export const parse = (s: string) => JSON.parse(s);',
    focusAreas: 'security, error handling',
    experienceLevel: 'intermediate',
  },
});

console.log(`   description: ${description ?? '(none)'}`);
for (const message of messages) {
  const text = message.content.type === 'text' ? message.content.text : `[${message.content.type}]`;
  console.log(`   [${message.role}] ${text.split('\n')[0]}…`);
}

// MCP prompt messages map straight onto AI SDK messages — the roles line up
// one to one, because MCP has no `system` role for the mapping to fudge.
const { text } = await generateText({
  model,
  messages: messages.map((message) => ({
    role: message.role,
    content: message.content.type === 'text' ? message.content.text : '',
  })),
});

console.log(`\n🤖 Review:\n${text}\n`);

await client.close();

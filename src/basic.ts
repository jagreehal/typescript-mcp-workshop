import z from 'zod';
import { model } from './model';
import { generateText, tool } from 'ai';

const calculations = [
  'What is 25 plus 15?',
  // 'What is 50 minus 30?',
  // 'What is 8 multiplied by 6?',
  // 'What is 100 divided by 4?',
  // 'What happens if I try to divide by zero?',
  // 'Can you show me a series of calculations? First multiply 5 and 3, then add 10 to the result.',
];

const subtract = tool({
  description: 'use this to subtract numbers',
  parameters: z.object({
    a: z.coerce.number().describe('The first number'),
    b: z.coerce.number().describe('The second number'),
  }),
  execute: async ({ a, b }) => {
    return {
      result: a * b,
    };
  },
});

console.dir(subtract, { depth: null });

console.log('🧮 Testing Calculator Operations:\n');

for (const prompt of calculations) {
  console.log(`Question: ${prompt}`);
  const result = await generateText({
    model,
    prompt,
    tools: {
      subtract,
    },
    maxSteps: 10,
  });
  console.log(`Answer: ${result.text}\n`);
}

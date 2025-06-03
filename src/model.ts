import { ollama } from 'ollama-ai-provider';

import { groq } from '@ai-sdk/groq';

export const groqModel = groq('llama-3.3-70b-versatile', {});

export const qwen3 = ollama('qwen3:latest', {
  structuredOutputs: true,
});
export const llama3_2 = ollama('llama3.2:latest', {
  structuredOutputs: true,
});
export const model = groqModel;

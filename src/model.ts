import { ollama } from 'ollama-ai-provider';

export const qwen3 = ollama('qwen3:latest', {
  structuredOutputs: true,
});
export const llama3_2 = ollama('llama3.2:latest', {

  structuredOutputs: true,
});
export const model = llama3_2;

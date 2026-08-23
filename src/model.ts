import 'dotenv/config';

import { groq } from '@ai-sdk/groq';
import { mistral } from '@ai-sdk/mistral';
import { ollama } from 'ai-sdk-ollama';

export const groqModel = groq('llama-3.3-70b-versatile');
export const mistralModel = mistral('mistral-small-latest');

export const qwen3 = ollama('qwen3:latest', { structuredOutputs: true });
export const llama3_2 = ollama('llama3.2:latest', { structuredOutputs: true });

/** Swap this for whichever provider you have a key (or a local Ollama) for. */
export const model = mistralModel;

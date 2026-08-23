import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { isEntrypoint } from '../shared/entrypoint';
import { banner, serveHttp } from '../shared/serve';
import { PORT } from './constants';

/**
 * Tools, and nothing else.
 *
 * The shape to notice: `buildServer()` is a **factory**, and `serveHttp` calls
 * it once per request. On 2026-07-28 there is no handshake and no session, so
 * an instance has nothing to remember between requests — which is exactly what
 * lets you put two of these behind a round-robin load balancer with no shared
 * storage (module 08 does precisely that).
 */
export function buildServer() {
  const server = new McpServer(
    { name: 'calculator-tools-server', version: '2.0.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'add',
    {
      title: 'Add',
      description: 'Add two numbers together',
      inputSchema: z.object({
        a: z.coerce.number().describe('The first number to add'),
        b: z.coerce.number().describe('The second number to add'),
      }),
      // A tool that only reads and never surprises the caller says so. Clients
      // use these hints to decide what needs a human in the loop.
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ a, b }) => ({ content: [{ type: 'text', text: String(a + b) }] }),
  );

  server.registerTool(
    'subtract',
    {
      title: 'Subtract',
      description: 'Subtract the second number from the first',
      inputSchema: z.object({
        a: z.coerce.number().describe('The number to subtract from'),
        b: z.coerce.number().describe('The number to subtract'),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ a, b }) => ({ content: [{ type: 'text', text: String(a - b) }] }),
  );

  server.registerTool(
    'multiply',
    {
      title: 'Multiply',
      description: 'Multiply two numbers together',
      inputSchema: z.object({
        a: z.coerce.number().describe('The first number to multiply'),
        b: z.coerce.number().describe('The second number to multiply'),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ a, b }) => ({ content: [{ type: 'text', text: String(a * b) }] }),
  );

  server.registerTool(
    'divide',
    {
      title: 'Divide',
      description: 'Divide the first number by the second',
      inputSchema: z.object({
        a: z.coerce.number().describe('The dividend'),
        b: z.coerce.number().describe('The divisor'),
      }),
      // Structured output: the model gets prose, the caller gets a number.
      outputSchema: z.object({ result: z.number() }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ a, b }) => {
      // A tool-level failure is a RESULT with isError, not a protocol error.
      // The model sees it and can recover; a thrown ProtocolError cannot be
      // recovered from because it never reaches the conversation.
      if (b === 0) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Cannot divide by zero — pick a non-zero divisor.' }],
        };
      }
      const output = { result: a / b };
      return {
        content: [{ type: 'text', text: String(output.result) }],
        structuredContent: output,
      };
    },
  );

  return server;
}

if (isEntrypoint(import.meta.url)) {
  await serveHttp(buildServer, PORT);
  banner('🔧 Tools-only MCP server', PORT, [
    'tools     add, subtract, multiply, divide',
    'note      the factory runs once per request — no session, no shared state',
  ]);
}

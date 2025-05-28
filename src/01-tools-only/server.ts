import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { PORT } from './constants';

const server = new FastMCP({
  name: 'calculator-tools-server',
  version: '1.0.0',
  instructions: `
This is a calculator server.
  `.trim(),
});

server.addTool({
  name: 'add',
  description: 'Add two numbers together',
  parameters: z.object({
    a: z.coerce.number().describe('The first number to add'),
    b: z.coerce.number().describe('The second number to add'),
  }),
  annotations: {
    openWorldHint: false, // This tool doesn't interact with external systems
    readOnlyHint: true, // This tool doesn't modify anything
    title: 'Number Addition Calculator',
  },
  execute: async (args) => {
    const result = args.a + args.b;
    return result.toString(); // NOTE: this is a string, not a number
  },
});

server.addTool({
  name: 'subtract',
  description: 'Subtract two numbers',
  parameters: z.object({
    a: z.coerce.number().describe('The first number to subtract from'),
    b: z.coerce.number().describe('The number to subtract'),
  }),
  annotations: {
    openWorldHint: false,
    readOnlyHint: true,
    title: 'Precision Subtraction Calculator',
  },
  execute: async (args) => {
    const result = args.a - args.b;
    return result.toString();
  },
});

server.addTool({
  name: 'multiply',
  description: 'Multiply two numbers together',
  parameters: z.object({
    a: z.coerce.number().describe('The first number to multiply'),
    b: z.coerce.number().describe('The second number to multiply'),
  }),
  annotations: {
    openWorldHint: false,
    readOnlyHint: true,
    title: 'Number Multiplication Engine',
  },
  execute: async (args) => {
    const result = args.a * args.b;
    return result.toString();
  },
});

server.addTool({
  name: 'divide',
  description: 'Divide first number by second number',
  parameters: z.object({
    a: z.coerce.number().describe('The number to be divided (dividend)'),
    b: z.coerce.number().describe('The number to divide by (divisor)'),
  }),
  annotations: {
    openWorldHint: false,
    readOnlyHint: true,
    title: 'Smart Division Calculator',
  },
  execute: async (args) => {
    if (args.b === 0) {
      throw new Error('Cannot divide by zero');
    }
    const result = args.a / args.b;
    return result.toString();
  },
});

// Event handlers to demonstrate server lifecycle
server.on('connect', (event) => {
  console.log('🔗 Client connected to tools-only server');
  console.log(`   Session: ${event.session}`);
});

server.on('disconnect', (event) => {
  console.log('❌ Client disconnected from tools-only server');
  console.log(`   Session: ${event.session}`);
});

// Start the server
server.start({
  transportType: 'httpStream',
  httpStream: { port: PORT },
});
console.log(`🔧 Tools-Only MCP Server running on port ${PORT}`);
console.log(`📡 Connect via: http://localhost:${PORT}/stream`);

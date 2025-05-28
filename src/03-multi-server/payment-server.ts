import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { PAYMENT_SERVER_PORT } from './constants';

// Hardcoded transaction data
interface Transaction {
  id: number;
  from: string;
  to: string;
  amount: number;
  date: string;
}

const transactions: Transaction[] = [
  { id: 1, from: 'Bob', to: 'Alice', amount: 100, date: '2024-03-15' },
  { id: 2, from: 'Alice', to: 'Charlie', amount: 50, date: '2024-03-16' },
  { id: 3, from: 'Bob', to: 'Charlie', amount: 75, date: '2024-03-17' },
  { id: 4, from: 'Charlie', to: 'Bob', amount: 25, date: '2024-03-18' },
  { id: 5, from: 'Bob', to: 'Alice', amount: 200, date: '2024-03-19' }
];

const server = new FastMCP({
  name: 'payment-server',
  version: '1.0.0',
  instructions: `
This is a payment transaction server that manages user payment history.
  `.trim(),
});

// Event handlers
server.on('connect', (event) => {
  console.log('Client connected:', event.session);
});

server.on('disconnect', (event) => {
  console.log('Client disconnected:', event.session);
});

// Tool: Get all transactions
server.addTool({
  name: 'getAllTransactions',
  description: 'Get a list of all transactions',
  parameters: z.object({}),
  annotations: {
    readOnlyHint: true,
  },
  execute: async () => {
    return JSON.stringify(transactions, null, 2);
  },
});

// Tool: Get user transactions
server.addTool({
  name: 'getUserTransactions',
  description: 'Get all transactions for a specific user (both sent and received)',
  parameters: z.object({
    name: z.string().describe('The name of the user to get transactions for'),
  }),
  annotations: {
    readOnlyHint: true,
  },
  execute: async (args) => {
    const userTransactions = transactions.filter(
      t => t.from.toLowerCase() === args.name.toLowerCase() ||
           t.to.toLowerCase() === args.name.toLowerCase()
    );

    if (userTransactions.length === 0) {
      throw new Error(`No transactions found for user ${args.name}`);
    }

    return JSON.stringify(userTransactions, null, 2);
  },
});

// Tool: Get latest transactions
server.addTool({
  name: 'getLatestTransactions',
  description: 'Get the latest transactions for a specific user (both sent and received)',
  parameters: z.object({
    name: z.string().describe('The name of the user to get transactions for'),
    limit: z.number().optional().default(3).describe('Number of latest transactions to return'),
  }),
  annotations: {
    readOnlyHint: true,
  },
  execute: async (args) => {
    const userTransactions = transactions
      .filter(t => t.from.toLowerCase() === args.name.toLowerCase() ||
                  t.to.toLowerCase() === args.name.toLowerCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, args.limit);

    if (userTransactions.length === 0) {
      throw new Error(`No transactions found for user ${args.name}`);
    }

    return JSON.stringify(userTransactions, null, 2);
  },
});

// Start server with HTTP Stream transport
server.start({
  transportType: 'httpStream',
  httpStream: {
    port: PAYMENT_SERVER_PORT,
  },
});

console.log(`💰 Payment MCP Server running on port ${PAYMENT_SERVER_PORT}`);
console.log(`📡 Connect via: http://localhost:${PAYMENT_SERVER_PORT}/stream`);
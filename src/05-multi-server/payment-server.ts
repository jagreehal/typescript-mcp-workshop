import { FastMCP } from 'fastmcp';
import z from 'zod';
import { PAYMENT_SERVER_PORT } from './constants';

// Hardcoded transaction data
interface Transaction {
  id: number;
  userId: string;
  amount: number;
  description: string;
  date: string;
}

const transactions: Transaction[] = [
  {
    id: 1,
    userId: 'b1a7e8c2-1f2d-4e3a-9c4b-1a2b3c4d5e6f',
    amount: 100,
    description: 'Groceries',
    date: '2023-01-15',
  },
  {
    id: 2,
    userId: 'b1a7e8c2-1f2d-4e3a-9c4b-1a2b3c4d5e6f',
    amount: 50,
    description: 'Coffee',
    date: '2023-01-16',
  },
  {
    id: 3,
    userId: 'a2b3c4d5-6e7f-8a9b-0c1d-2e3f4a5b6c7d',
    amount: 200,
    description: 'Concert Tickets',
    date: '2023-01-10',
  },
  {
    id: 4,
    userId: 'b1a7e8c2-1f2d-4e3a-9c4b-1a2b3c4d5e6f',
    amount: 75,
    description: 'Dinner',
    date: '2023-01-14',
  },
  {
    id: 5,
    userId: 'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
    amount: 30,
    description: 'Book',
    date: '2023-01-18',
  },
  {
    id: 6,
    userId: 'b1a7e8c2-1f2d-4e3a-9c4b-1a2b3c4d5e6f',
    amount: 120,
    description: 'Online Course',
    date: '2023-01-12',
  },
];

const server = new FastMCP({
  name: 'payment-server',
  version: '1.0.0',
  instructions: `
This is a payment processing server that provides access to transaction data.
  `.trim(),
});

// Event handlers
server.on('connect', (event) => {
  console.log(
    'Client connected to payment server:',
    JSON.stringify(event.session, null, 2),
  );
});

server.on('disconnect', (event) => {
  console.log(
    'Client disconnected from payment server:',
    JSON.stringify(event.session, null, 2),
  );
});

// Tool: Get transactions by email
server.addTool({
  name: 'getTransactionsUsingUserId',
  description: `Get transactions for a user by their user ID. Requires userId as input. Returns an array of transactions for that user. Example input: { userId: 'b1a7e8c2-1f2d-4e3a-9c4b-1a2b3c4d5e6f', count: 3 }. Example output: [ { id: 1, date: '2022-01-01', amount: 100.00 }, ... ]`,
  parameters: z.object({
    userId: z
      .string()
      .describe('The user id of the user to find transactions for'),
    count: z.coerce
      .number()
      .optional()
      .describe('The number of recent transactions to retrieve'),
  }),
  annotations: {
    readOnlyHint: true,
  },
  execute: async (args) => {
    console.log(
      `[Payment Server] getTransactions resolved userId: ${args.userId}`,
    );
    const userTransactions = transactions.filter(
      (t) => t.userId === args.userId,
    );
    const sortedTransactions = userTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const result = args.count
      ? sortedTransactions.slice(0, args.count)
      : sortedTransactions;
    const resultString = JSON.stringify(result, null, 2);
    console.log(
      `[Payment Server] getTransactions found ${result.length} transactions: ${resultString}`,
    );
    return resultString;
  },
});

// Start server with HTTP Stream transport
server.start({
  transportType: 'httpStream',
  httpStream: {
    port: PAYMENT_SERVER_PORT,
  },
});

console.log(`💳 Payment MCP Server running on port ${PAYMENT_SERVER_PORT}`);
console.log(`📡 Connect via: http://localhost:${PAYMENT_SERVER_PORT}/stream`);

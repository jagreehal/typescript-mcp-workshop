import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { BOB_API_KEY, ALICE_API_KEY, PORT } from './constants';

interface Transaction {
  id: number;
  from: string;
  to: string;
  amount: number;
  date: string;
}

interface ApiKey {
  id: string;
  key: string;
  userId: number;
  username: string;
  role: string;
  name: string;
  created_at: string;
}

interface ApiKeySession extends Record<string, unknown> {
  userId: number;
  username: string;
  role: string;
  apiKeyId: string;
  apiKeyName: string;
}

    const DEMO_API_KEYS: ApiKey[] = [
      {
        id: '1',
        key: BOB_API_KEY,
        userId: 1,
        username: 'bob',
        role: 'customer',
        name: 'Bob Personal Key',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        key: ALICE_API_KEY,
        userId: 3,
        username: 'alice',
        role: 'customer',
        name: 'Alice Personal Key',
        created_at: '2024-01-15T00:00:00Z'
      },
      {
        id: '3',
        key: 'x',
        userId: 3,
        username: 'charlie',
        role: 'customer',
        name: 'Charlie Personal Key',
        created_at: '2024-01-15T00:00:00Z'
      },
    ];

    function verifyApiKey(apiKey: string): { valid: boolean; user?: ApiKey; error?: string } {
      const user = DEMO_API_KEYS.find(key => key.key === apiKey);
      if (!user) {
        return { valid: false, error: 'Invalid API key' };
      }
      return { valid: true, user };
    }

const transactions: Transaction[] = [
  // Bob's transactions
  { id: 1, from: 'bob', to: 'alice', amount: 100, date: '2024-03-15' },
  { id: 3, from: 'bob', to: 'charlie', amount: 75, date: '2024-03-17' },
  { id: 5, from: 'bob', to: 'alice', amount: 200, date: '2024-03-19' },
  // Alice's transactions
  { id: 2, from: 'alice', to: 'charlie', amount: 50, date: '2024-03-16' },
  { id: 6, from: 'alice', to: 'bob', amount: 150, date: '2024-03-20' },
  // Charlie's transactions
  { id: 4, from: 'charlie', to: 'bob', amount: 25, date: '2024-03-18' },
  { id: 7, from: 'charlie', to: 'alice', amount: 80, date: '2024-03-21' }
];

const server = new FastMCP({
  name: 'payment-server',
  version: '1.0.0',
  instructions: `
This is a payment transaction server that manages user payment history.
  `.trim(),
   authenticate: async (request) => {
        const apiKey = request.headers['x-api-key'];

        if (!apiKey || Array.isArray(apiKey)) {
          throw new Response(null, {
            status: 401,
            statusText: 'Unauthorized - API key required in x-api-key header',
          });
        }

        const auth = verifyApiKey(apiKey);
        if (!auth.valid || !auth.user) {
          throw new Response(null, {
            status: 401,
            statusText: auth.error || 'Invalid API key',
          });
        }

        return {
          userId: auth.user.userId,
          username: auth.user.username,
          role: auth.user.role,
          apiKeyId: auth.user.id,
          apiKeyName: auth.user.name
        } as ApiKeySession;
      },
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
  execute: async (_, { session }) => {
    if (!session) {
      throw new Error('Authentication required');
    }

    // Only return transactions related to the authenticated user
    const userTransactions = transactions.filter(
      t => t.from === session.username.toLowerCase() || t.to === session.username.toLowerCase()
    );

    return JSON.stringify(userTransactions, null, 2);
  },
});

// Tool: Get user transactions
server.addTool({
  name: 'getUserTransactions',
  description: 'Get all transactions for the authenticated user (both sent and received)',
  parameters: z.object({}),
  annotations: {
    readOnlyHint: true,
  },
  execute: async (_, { session }) => {
    if (!session) {
      throw new Error('Authentication required');
    }

    const userTransactions = transactions.filter(
      t => t.from === session.username.toLowerCase() || t.to === session.username.toLowerCase()
    );

    if (userTransactions.length === 0) {
      throw new Error(`No transactions found for user ${session.username}`);
    }

    return JSON.stringify(userTransactions, null, 2);
  },
});

// Tool: Get latest transactions
server.addTool({
  name: 'getLatestTransactions',
  description: 'Get the latest transactions for the authenticated user',
  parameters: z.object({
    limit: z.number().optional().default(3).describe('Number of latest transactions to return'),
  }),
  annotations: {
    readOnlyHint: true,
  },
  execute: async (args, { session }) => {
    if (!session) {
      throw new Error('Authentication required');
    }

    const userTransactions = transactions
      .filter(t => t.from === session.username.toLowerCase() || t.to === session.username.toLowerCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, args.limit);

    if (userTransactions.length === 0) {
      throw new Error(`No transactions found for user ${session.username}`);
    }

    return JSON.stringify(userTransactions, null, 2);
  },
});

// Add a new tool to get account balance
server.addTool({
  name: 'getAccountBalance',
  description: 'Get the current account balance for the authenticated user',
  parameters: z.object({}),
  annotations: {
    readOnlyHint: true,
  },
  execute: async (_, { session }) => {
    if (!session) {
      throw new Error('Authentication required');
    }

    let balance = 0;
    transactions.forEach(t => {
      if (t.from === session.username.toLowerCase()) {
        balance -= t.amount; // Sent money (debit)
      }
      if (t.to === session.username.toLowerCase()) {
        balance += t.amount; // Received money (credit)
      }
    });

    return JSON.stringify({ username: session.username, balance }, null, 2);
  },
});

// Start server with HTTP Stream transport
server.start({
  transportType: 'httpStream',
  httpStream: {
    port: PORT,
  },
});

console.log(`💰 Payment MCP Server running on port ${PORT}`);
console.log(`📡 Connect via: http://localhost:${PORT}/stream`);
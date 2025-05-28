import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { USER_SERVER_PORT } from './constants';

// Hardcoded user data
interface User {
  id: number;
  name: string;
  email: string;
  balance: number;
}

const users: User[] = [
  { id: 1, name: 'Bob', email: 'bob@example.com', balance: 1000 },
  { id: 2, name: 'Alice', email: 'alice@example.com', balance: 2000 },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', balance: 500 }
];

const server = new FastMCP({
  name: 'user-server',
  version: '1.0.0',
  instructions: `
This is a user management server that provides access to user data.
  `.trim(),
});

// Event handlers
server.on('connect', (event) => {
  console.log('Client connected:', event.session);
});

server.on('disconnect', (event) => {
  console.log('Client disconnected:', event.session);
});

// Tool: Get all users
server.addTool({
  name: 'getAllUsers',
  description: 'Get a list of all users',
  parameters: z.object({}),
  annotations: {
    readOnlyHint: true,
  },
  execute: async () => {
    return JSON.stringify(users, null, 2);
  },
});

// Tool: Get user by name
server.addTool({
  name: 'getUserByName',
  description: 'Get a user by their name',
  parameters: z.object({
    name: z.string().describe('The name of the user to find'),
  }),
  annotations: {
    readOnlyHint: true,
  },
  execute: async (args) => {
    const user = users.find(u => u.name.toLowerCase() === args.name.toLowerCase());
    if (!user) {
      throw new Error(`User ${args.name} not found`);
    }
    return JSON.stringify(user, null, 2);
  },
});

// Start server with HTTP Stream transport
server.start({
  transportType: 'httpStream',
  httpStream: {
    port: USER_SERVER_PORT,
  },
});

console.log(`👥 User MCP Server running on port ${USER_SERVER_PORT}`);
console.log(`📡 Connect via: http://localhost:${USER_SERVER_PORT}/stream`);
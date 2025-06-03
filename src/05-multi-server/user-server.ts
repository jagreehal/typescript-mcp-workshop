import { FastMCP } from 'fastmcp';
import z from 'zod';
import { USER_SERVER_PORT } from './constants';

// Hardcoded user data
interface User {
  id: string;
  name: string;
  email: string;
  balance: number;
}

const users: User[] = [
  {
    id: 'b1a7e8c2-1f2d-4e3a-9c4b-1a2b3c4d5e6f',
    name: 'Bob',
    email: 'bob@example.com',
    balance: 1000,
  },
  {
    id: 'a2b3c4d5-6e7f-8a9b-0c1d-2e3f4a5b6c7d',
    name: 'Alice',
    email: 'alice@example.com',
    balance: 2000,
  },
  {
    id: 'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
    name: 'Charlie',
    email: 'charlie@example.com',
    balance: 500,
  },
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

server.addTool({
  name: 'getUserIdByEmail',
  description: `Get the user ID for a user by their email address.`,
  parameters: z.object({
    email: z.string().describe('The email of the user to find'),
  }),
  annotations: {
    readOnlyHint: true,
  },
  execute: async (args) => {
    console.log(
      `[User Server] Executing getUserIdByEmail for email: ${args.email}`,
    );
    const user = users.find(
      (u) => u.email.toLowerCase() === args.email.toLowerCase(),
    );
    if (!user) {
      console.log(`[User Server] User not found: ${args.email}`);
      throw new Error(`User with email ${args.email} not found`);
    }
    console.log(`[User Server] Found user ID: ${user.id}`);
    return user.id;
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

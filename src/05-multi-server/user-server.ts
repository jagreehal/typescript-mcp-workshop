import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { isEntrypoint } from '../shared/entrypoint';
import { banner, serveHttp } from '../shared/serve';
import { USER_SERVER_PORT } from './constants';
import { findByEmail, findById, users } from './users';

/** The directory service: it knows who people are, and nothing about money. */
export function buildServer() {
  const server = new McpServer(
    { name: 'user-service', version: '2.0.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'getUserIdByEmail',
    {
      title: 'Look up a user ID',
      description: 'Get the user ID for a user by their email address',
      inputSchema: z.object({ email: z.string().describe('Email address') }),
      outputSchema: z.object({ id: z.string(), name: z.string() }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ email }) => {
      const user = findByEmail(email);
      if (!user) {
        return { isError: true, content: [{ type: 'text', text: `No user with email ${email}` }] };
      }
      const output = { id: user.id, name: user.name };
      return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output };
    },
  );

  server.registerTool(
    'getUserById',
    {
      title: 'Get a user',
      description: 'Get a user profile by ID',
      inputSchema: z.object({ id: z.string().describe('User ID') }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ id }) => {
      const user = findById(id);
      if (!user) return { isError: true, content: [{ type: 'text', text: `No user with id ${id}` }] };
      return { content: [{ type: 'text', text: JSON.stringify(user, null, 2) }] };
    },
  );

  server.registerTool(
    'listUsers',
    {
      title: 'List users',
      description: 'List every known user',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            users.map(({ id, name, email }) => ({ id, name, email })),
            null,
            2,
          ),
        },
      ],
    }),
  );

  return server;
}

if (isEntrypoint(import.meta.url)) {
  await serveHttp(buildServer, USER_SERVER_PORT);
  banner('👤 User MCP server', USER_SERVER_PORT, [
    'tools     getUserIdByEmail, getUserById, listUsers',
  ]);
}

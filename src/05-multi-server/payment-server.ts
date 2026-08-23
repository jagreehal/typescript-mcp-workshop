import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { isEntrypoint } from '../shared/entrypoint';
import { banner, serveHttp } from '../shared/serve';
import { PAYMENT_SERVER_PORT } from './constants';
import { findById } from './users';

/**
 * The payments service: it knows about money and takes user IDs on trust.
 *
 * Note the annotations on `transfer`. `readOnlyHint: false` plus
 * `destructiveHint: true` is how a tool tells a client "this one needs a human".
 * Nothing enforces it — it is a hint to the host, not a permission.
 */
export function buildServer() {
  const server = new McpServer(
    { name: 'payment-service', version: '2.0.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'getBalance',
    {
      title: 'Get balance',
      description: 'Get the account balance for a user ID',
      inputSchema: z.object({ userId: z.string().describe('User ID') }),
      outputSchema: z.object({ balance: z.number() }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ userId }) => {
      const user = findById(userId);
      if (!user) return { isError: true, content: [{ type: 'text', text: `No user with id ${userId}` }] };
      const output = { balance: user.balance };
      return { content: [{ type: 'text', text: `${user.name}: ${user.balance}` }], structuredContent: output };
    },
  );

  server.registerTool(
    'transfer',
    {
      title: 'Transfer funds',
      description: 'Move funds from one user to another',
      inputSchema: z.object({
        fromUserId: z.string().describe('Sender user ID'),
        toUserId: z.string().describe('Recipient user ID'),
        amount: z.coerce.number().positive().describe('Amount to transfer'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async ({ fromUserId, toUserId, amount }) => {
      const from = findById(fromUserId);
      const to = findById(toUserId);
      if (!from || !to) {
        return { isError: true, content: [{ type: 'text', text: 'Unknown sender or recipient' }] };
      }
      if (from.balance < amount) {
        return {
          isError: true,
          content: [{ type: 'text', text: `${from.name} has ${from.balance}, cannot send ${amount}` }],
        };
      }
      from.balance -= amount;
      to.balance += amount;
      return {
        content: [
          { type: 'text', text: `Sent ${amount} from ${from.name} to ${to.name}. ${from.name} now has ${from.balance}.` },
        ],
      };
    },
  );

  return server;
}

if (isEntrypoint(import.meta.url)) {
  await serveHttp(buildServer, PAYMENT_SERVER_PORT);
  banner('💳 Payment MCP server', PAYMENT_SERVER_PORT, ['tools     getBalance, transfer']);
}

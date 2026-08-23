import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

/**
 * The server under test.
 *
 * The only structural difference from every other module: this file EXPORTS
 * its factory instead of calling `serveHttp` at the bottom. A factory is
 * already the unit — `createMcpHandler` calls it once per request — so a test
 * can call it too, and nothing about the code under test bends to be
 * testable.
 */

type Order = { id: string; amountPence: number; refunded: boolean };

/** Seeded per factory call, so tests never share mutable state. */
export function seedOrders(): Map<string, Order> {
  return new Map([
    ['ord_1', { id: 'ord_1', amountPence: 4500, refunded: false }],
    ['ord_2', { id: 'ord_2', amountPence: 12_000, refunded: true }],
  ]);
}

export const REFUND_LIMIT_PENCE = 10_000;

export function buildServer(orders: Map<string, Order> = seedOrders()) {
  const server = new McpServer(
    { name: 'orders-under-test', version: '2.0.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'refund_order',
    {
      title: 'Refund an order',
      description: 'Refund an order in full',
      inputSchema: z.object({
        orderId: z.string().min(1).describe('The order to refund'),
        reason: z.string().min(3).describe('Why'),
      }),
      outputSchema: z.object({ orderId: z.string(), refundedPence: z.number() }),
    },
    async ({ orderId, reason }) => {
      const order = orders.get(orderId);

      // Three business failures, all returned rather than thrown. The model
      // reads them and can act: pick another order, ask a human, stop.
      if (!order) return failure(`No order ${orderId}`);
      if (order.refunded) return failure(`Order ${orderId} was already refunded`);
      if (order.amountPence > REFUND_LIMIT_PENCE) {
        return failure(`Order ${orderId} is over the £100 automatic limit — needs approval`);
      }

      order.refunded = true;
      const output = { orderId, refundedPence: order.amountPence };
      return {
        content: [{ type: 'text', text: `Refunded ${orderId} (${reason})` }],
        structuredContent: output,
      };
    },
  );

  return server;
}

function failure(text: string) {
  return { isError: true as const, content: [{ type: 'text' as const, text }] };
}

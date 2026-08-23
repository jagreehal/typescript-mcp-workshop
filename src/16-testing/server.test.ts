import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport, createMcpHandler } from '@modelcontextprotocol/server';
import { buildServer, seedOrders } from './server';

/**
 * Tests, with no framework and no HTTP.
 *
 * `InMemoryTransport.createLinkedPair()` wires a real `Client` to a real
 * server over a pair of linked queues. Every byte of framing, validation and
 * dispatch runs; only the socket is missing. A suite like this finishes in
 * milliseconds and still fails when the protocol contract breaks.
 *
 * Run: `pnpm test`
 */

/** `content` is a union of block types, so narrow before reading `text`. */
function firstText(content: { type: string }[] | undefined): string {
  const block = content?.find((item) => item.type === 'text');
  return block && 'text' in block ? String(block.text) : '';
}

describe('refund_order, through a real client', () => {
  let client: Client;
  let orders: ReturnType<typeof seedOrders>;

  before(async () => {
    orders = seedOrders();
    const server = buildServer(orders);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test', version: '1.0.0' });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  after(async () => {
    await client.close();
  });

  test('a successful refund returns text and typed output', async () => {
    const result = await client.callTool({
      name: 'refund_order',
      arguments: { orderId: 'ord_1', reason: 'damaged' },
    });

    assert.equal(result.isError, undefined);
    // The model reads content. A programmatic caller reads structuredContent.
    // Assert both, because a tool that drops either half is broken for one of
    // its two audiences.
    assert.match(firstText(result.content), /Refunded ord_1/);
    assert.deepEqual(result.structuredContent, { orderId: 'ord_1', refundedPence: 4500 });
  });

  test('a business failure is a RESULT, not a rejection', async () => {
    // The single most common MCP bug: throwing where you should return. A
    // thrown error never reaches the conversation, so the model cannot
    // recover from it. This assertion is what stops that regressing.
    const result = await client.callTool({
      name: 'refund_order',
      arguments: { orderId: 'ord_2', reason: 'duplicate' },
    });

    assert.equal(result.isError, true);
    assert.match(firstText(result.content), /already refunded/);
  });

  test('a schema violation comes back as isError, not a rejection', async () => {
    // Worth pinning, because it is the opposite of what most people assume.
    // The SDK validates `inputSchema` before your handler runs and turns a
    // failure into an `isError` RESULT rather than a `-32602`. The model
    // therefore sees why its arguments were wrong and can fix them, which is
    // the behaviour you want — but if you wrote a client that only inspects
    // rejections, it will miss every validation error.
    const result = await client.callTool({
      name: 'refund_order',
      arguments: { orderId: '', reason: 'x' },
    });

    assert.equal(result.isError, true);
    assert.match(firstText(result.content), /Input validation error/);
    assert.match(firstText(result.content), /orderId/);
  });

  test('an unknown tool is -32601, not an isError result', async () => {
    await assert.rejects(client.callTool({ name: 'refund_everything', arguments: {} }), /-32601|not found/i);
  });
});

describe('the request envelope, over raw HTTP', () => {
  // The client always builds a correct `_meta` envelope, so testing that the
  // server rejects a bad one means bypassing the client. `handler.fetch`
  // takes a standard Request, so this needs no port and no listener.
  const handler = createMcpHandler(() => buildServer());

  after(async () => {
    await handler.close();
  });

  test('a 2026-07-28 request with no _meta envelope is refused', async () => {
    const response = await handler.fetch(
      new Request('http://localhost/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'MCP-Protocol-Version': '2026-07-28',
          'Mcp-Method': 'tools/call',
          'Mcp-Name': 'refund_order',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'refund_order', arguments: { orderId: 'ord_1', reason: 'test' } },
          // No `_meta`. On this revision that is not optional.
        }),
      }),
    );

    const body = (await response.json()) as { error?: { code: number; message: string } };
    assert.ok(body.error, `expected an error, got ${JSON.stringify(body)}`);
    assert.equal(body.error.code, -32602);
    // The error names the field you left out rather than saying "invalid".
    assert.match(body.error.message, /meta|protocolVersion|clientInfo|capabilit/i);
  });
});

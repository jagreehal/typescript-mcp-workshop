/**
 * 16 — Testing, as a story that proves itself.
 *
 * The module's own point, made in its own format: a real client and a real
 * server over `InMemoryTransport`, with every byte of framing, validation and
 * dispatch running and only the socket missing.
 *
 * The node:test suite next door covers the same seams tersely. This one is
 * here because a reader who wants to know *how to test an MCP server* should
 * be able to read the answer rather than infer it.
 */
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { story } from 'executable-stories-vitest';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildServer, seedOrders } from './server';

async function linkedPair() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = buildServer();
  await server.connect(serverTransport);
  const client = new Client({ name: 'testing-story', version: '2.0.0' });
  await client.connect(clientTransport);
  return { client, close: () => client.close() };
}

describe('16 — testing', () => {
  beforeEach(() => {
    seedOrders();
  });

  it('runs the whole protocol without a socket', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'No HTTP, no framework, no mocks',
      markdown: [
        '`InMemoryTransport.createLinkedPair()` connects a real `Client` to a real',
        'server over linked queues. Framing, schema validation and dispatch all',
        'run; only the socket is missing.',
        '',
        'That matters more than speed: a mocked server tests your mock. This tests',
        'the contract, and it still finishes in milliseconds.',
      ].join('\n'),
    });

    story.given('a client and a server joined by a linked pair');
    const { client, close } = await linkedPair();
    try {
      story.when('the client lists tools');
      const tools = await client.listTools();

      story.then('it gets the real catalog, through the real dispatch path');
      expect(tools.tools.length).toBeGreaterThan(0);

      story.table({
        label: 'The catalog, over no network at all',
        columns: ['Tool'],
        rows: tools.tools.map((tool) => [tool.name]),
      });
    } finally {
      await close();
    }
  });

  it('keeps a schema violation and a missing tool on different sides of the line', async ({
    task,
  }) => {
    story.init(task);
    story.section({
      title: 'The distinction worth a test',
      markdown: [
        'A bad argument is a call made in good faith, so it comes back as an',
        '`isError` result the model can correct. A tool that does not exist is a',
        '`-32601`: nothing about the request made sense.',
        '',
        'Getting these the wrong way round is the most common bug in a first MCP',
        'server, and it is invisible until a model hits it.',
      ].join('\n'),
    });

    const { client, close } = await linkedPair();
    try {
      story.given('a server with a typed tool');

      story.when('a caller sends the wrong type');
      const tools = await client.listTools();
      const first = tools.tools[0]!;
      const bad = await client.callTool({ name: first.name, arguments: { nonsense: true } });

      story.then('validation answers with a result, not an exception');
      expect(bad.isError).toBe(true);

      story.and('a tool that does not exist is a protocol error instead');
      await expect(client.callTool({ name: 'no_such_tool', arguments: {} })).rejects.toThrow();
    } finally {
      await close();
    }
  });
});

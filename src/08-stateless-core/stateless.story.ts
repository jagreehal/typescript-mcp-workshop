/**
 * 08 — The stateless core, as a story that proves itself.
 *
 * The release notes show the before/after as a picture. A picture was true the
 * day someone drew it and will never tell you when it stops being true.
 *
 * This file draws the same diagrams and then earns them, against the tools
 * `server.ts` actually registers: two instances of the real `buildServer`, a
 * round-robin balancer with no affinity, and assertions that fail the moment a
 * request needs a particular backend.
 *
 *   pnpm test:story
 */
import { createServer, request as httpRequest, type Server } from 'node:http';
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '../shared/connect';
import { serveHttp, type McpHttpServer } from '../shared/serve';
import { buildServer } from './server';
import type { Client } from '@modelcontextprotocol/client';

/** A balancer that knows nothing about MCP: no affinity, alternate every request. */
function roundRobin(targets: number[]): Server {
  let next = 0;
  return createServer((incoming, outgoing) => {
    const target = targets[next % targets.length]!;
    next += 1;
    const proxied = httpRequest(
      {
        host: '127.0.0.1',
        port: target,
        path: incoming.url,
        method: incoming.method,
        headers: { ...incoming.headers, host: `127.0.0.1:${target}` },
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      },
    );
    proxied.on('error', () => {
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end('Bad Gateway');
    });
    incoming.pipe(proxied);
  });
}

// Ports of their own: the demo's 8090-8092 stay free so `pnpm example:08` can
// run in another terminal while the stories do.
const PORTS = [8191, 8192];
const BALANCER_PORT = 8190;
const MCP_URL = `http://127.0.0.1:${BALANCER_PORT}/mcp`;

describe('08 — the stateless core', () => {
  const instances: McpHttpServer[] = [];
  let balancer: Server;
  let client: Client;

  beforeAll(async () => {
    for (const [index, port] of PORTS.entries()) {
      instances.push(await serveHttp(() => buildServer(`instance-${index + 1}`), port));
    }
    balancer = roundRobin(PORTS);
    await new Promise<void>((resolve) => balancer.listen(BALANCER_PORT, '127.0.0.1', resolve));
    client = await connect(MCP_URL);
  });

  afterAll(async () => {
    await client?.close();
    await new Promise<void>((resolve) => balancer.close(() => resolve()));
    for (const instance of instances) await instance.close();
  });

  it('serves one conversation from whichever instance is free', async ({ task }) => {
    story.init(task);

    story.section({
      title: 'What 2026-07-28 removed',
      markdown: [
        'The revision deleted `initialize`, `initialized` and the `Mcp-Session-Id`',
        'header (SEP-2575, SEP-2567). Every request now carries its own protocol',
        'version, client identity and capabilities in `_meta`, which is what makes',
        'it self-describing, which is what makes it routable.',
        '',
        'The payoff is the part worth proving: **any request can land on any',
        'instance**, behind a balancer that has never heard of MCP.',
      ].join('\n'),
    });

    story.mermaid({
      title: 'Before: the session pins the conversation to one instance',
      code: [
        'flowchart LR',
        '  C[Client] -->|Mcp-Session-Id: sess_9c2f| LB[Load Balancer<br/>sticky]',
        '  LB -->|must route here| A[Instance A<br/>holds sess_9c2f]',
        '  LB -.->|cannot serve| B[Instance B]',
        '  LB -.->|cannot serve| D[Instance C]',
        '  A -.->|falls over| X[conversation lost]',
      ].join('\n'),
    });

    story.mermaid({
      title: 'After: no session, so any instance will do',
      code: [
        'flowchart LR',
        '  C[Client] -->|self-describing request| LB[Load Balancer<br/>round-robin]',
        '  LB --> A[Instance A]',
        '  LB --> B[Instance B]',
        '  LB --> D[Instance C]',
        '  A --> S[(shared store)]',
        '  B --> S',
        '  D --> S',
      ].join('\n'),
    });

    story.given('two instances of the real server behind a round-robin balancer');
    expect(instances).toHaveLength(2);

    story.when('one client calls whereAmI four times over one connection');
    const served: string[] = [];
    for (let call = 0; call < 4; call++) {
      served.push(textOf(await client.callTool({ name: 'whereAmI', arguments: {} })));
    }

    story.table({
      label: 'Which backend answered',
      columns: ['Call', 'Served by'],
      rows: served.map((instance, index) => [`#${index + 1}`, instance]),
    });

    story.then('both instances answered, so nothing was pinned to one backend');
    expect(new Set(served).size).toBe(2);

    story.and('no session id was ever exchanged, because the revision has none');
    expect(JSON.stringify(served)).not.toContain('sess_');
  });

  it('keeps application state in a store the model can see, not in the transport', async ({
    task,
  }) => {
    story.init(task);

    story.section({
      title: 'State without sessions',
      markdown: [
        'Removing sessions does not remove state, it moves it somewhere you chose.',
        'A tool mints an explicit handle and the model passes it back as an',
        'argument, so the state is a visible part of the conversation instead of',
        'something hidden in the transport.',
        '',
        'That is also why it survives the balancer: the handle means the same',
        'thing on every instance, because both read the same store.',
      ].join('\n'),
    });

    story.given('a cart created by whichever instance took the first request');
    const startReply = textOf(await client.callTool({ name: 'startCart', arguments: {} }));
    const cartId = startReply.match(/cart_[a-f0-9]+/)?.[0] ?? '';
    expect(cartId).toMatch(/^cart_/);

    story.when('two items are added, which round-robin sends to different backends');
    const first = textOf(
      await client.callTool({ name: 'addItem', arguments: { cartId, item: 'espresso' } }),
    );
    const second = textOf(
      await client.callTool({ name: 'addItem', arguments: { cartId, item: 'cortado' } }),
    );

    story.table({
      label: 'The same cart, seen from different instances',
      columns: ['Step', 'Reply'],
      rows: [
        ['startCart', startReply],
        ['addItem espresso', first],
        ['addItem cortado', second],
      ],
    });

    story.then('the cart holds both items, whichever instance answered');
    expect(second).toContain('2 item(s)');

    story.and('the two writes were served by different instances');
    const instanceOf = (reply: string) => reply.match(/\[instance ([^\]]+)\]/)?.[1];
    expect(instanceOf(first)).toBeDefined();
    expect(instanceOf(first)).not.toBe(instanceOf(second));

    story.kv({ label: 'Sessions held by the protocol', value: 'none' });
    story.kv({ label: 'Sticky routing required', value: 'none' });
    story.kv({ label: 'Where state lives', value: 'a store you chose, keyed by an explicit handle' });
  });

  it('rejects a handle it never minted, without ending the conversation', async ({ task }) => {
    story.init(task);

    story.section({
      title: 'A bad handle is a result, not a crash',
      markdown: [
        'Handles outlive no connection now, so an expired or forged one has to be',
        'an ordinary tool result. Returning `isError` lets the model start a new',
        'cart and carry on; throwing would take the whole turn with it.',
      ].join('\n'),
    });

    story.given('a handle no instance ever issued');
    story.when('the model passes it to addItem');
    const result = await client.callTool({
      name: 'addItem',
      arguments: { cartId: 'cart_forged1', item: 'espresso' },
    });

    story.then('it comes back as an error result the model can read and recover from');
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('Unknown or expired cart');

    story.and('the connection still works afterwards');
    expect(textOf(await client.callTool({ name: 'whereAmI', arguments: {} }))).toContain(
      'served by instance',
    );
  });
});

function textOf(result: { content?: unknown }): string {
  const blocks = result.content;
  if (!Array.isArray(blocks)) return '';
  const first = blocks[0];
  return first && typeof first === 'object' && 'text' in first && typeof first.text === 'string'
    ? first.text
    : '';
}

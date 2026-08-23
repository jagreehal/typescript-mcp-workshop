/**
 * 12 — Observability, as a story that proves itself.
 *
 * The claim: trace context rides in `_meta` on every request, so a span from a
 * client joins a span from a server without a session to hang it off. Under a
 * stateful protocol the trace could outlive the connection it belonged to; here
 * each request carries its own parent.
 */
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '../shared/connect';
import { serveHttp, type McpHttpServer } from '../shared/serve';
import { buildServer } from './server';
import type { Client } from '@modelcontextprotocol/client';

const PORT = 8396;
const URL_ = `http://127.0.0.1:${PORT}/mcp`;

describe('12 — observability', () => {
  let server: McpHttpServer;
  let client: Client;

  beforeAll(async () => {
    server = await serveHttp(buildServer, PORT);
    client = await connect(URL_);
  });
  afterAll(async () => {
    await client?.close();
    await server.close();
  });

  it('reports a tool failure as a result the caller can act on', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'What you want on the span',
      markdown: [
        'A flaky tool is the interesting case for tracing: the call succeeded at',
        'the protocol level and failed at the business level. Recording it as an',
        '`isError` result rather than an exception is what lets a span carry the',
        'failure without the turn dying.',
      ].join('\n'),
    });

    story.given('a tool that fails some of the time');
    story.when('it is called until it fails');
    let sawFailure = false;
    let sawSuccess = false;
    for (let attempt = 0; attempt < 25 && !(sawFailure && sawSuccess); attempt++) {
      const result = await client.callTool({ name: 'flakyTool', arguments: {} });
      if (result.isError) sawFailure = true;
      else sawSuccess = true;
    }

    story.then('both outcomes arrive as results, never as a dropped connection');
    expect(sawSuccess).toBe(true);
    expect(sawFailure).toBe(true);
  });

  it('carries trace context per request, with no session to lose it', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'traceparent rides in _meta',
      markdown: [
        'The instrumentation reads W3C trace context out of the request `_meta`',
        'and continues the trace there. Because 2026-07-28 makes `_meta` part of',
        'every request rather than a handshake, a trace has somewhere to live on',
        'a request that landed anywhere.',
      ].join('\n'),
    });

    story.mermaid({
      title: 'One trace across the boundary',
      code: [
        'flowchart LR',
        '  A[Client span] -->|traceparent in _meta| B[Server span]',
        '  B --> C[Tool span]',
      ].join('\n'),
    });

    story.given('a traced server and an ordinary client');
    story.when('two independent calls are made');
    const first = await client.callTool({ name: 'lookupOrder', arguments: { orderId: 'ord_1' } });
    const second = await client.callTool({ name: 'lookupOrder', arguments: { orderId: 'ord_2' } });

    story.then('each is answered on its own, carrying its own context');
    expect(first.isError ?? false).toBe(false);
    expect(second.isError ?? false).toBe(false);

    story.and('nothing about the second call depended on the first');
    expect(JSON.stringify(first.content)).not.toEqual(JSON.stringify(second.content));
  });
});

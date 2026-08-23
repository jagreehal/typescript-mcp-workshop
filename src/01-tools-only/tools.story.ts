/**
 * 01 — Tools, as a story that proves itself.
 *
 * The distinction worth testing: a tool that *fails* and a call that is
 * *broken* are different things. One is a result the model can read and
 * recover from; the other is a protocol error. Getting them the wrong way
 * round is the most common bug in a first MCP server.
 */
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '../shared/connect';
import { serveHttp, type McpHttpServer } from '../shared/serve';
import { buildServer } from './server';
import type { Client } from '@modelcontextprotocol/client';

const PORT = 8387;
const URL_ = `http://127.0.0.1:${PORT}/mcp`;

describe('01 — tools', () => {
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

  it('returns a typed result the model can use without parsing prose', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'structuredContent, not just text',
      markdown: [
        'A tool with an `outputSchema` returns `structuredContent` alongside the',
        'text block. The model gets a value it can use directly instead of a',
        'sentence it has to parse back into a number.',
      ].join('\n'),
    });

    story.given('a divide tool that declares an output schema');
    story.when('it is called with 10 and 4');
    const result = await client.callTool({ name: 'divide', arguments: { a: 10, b: 4 } });

    story.then('the answer arrives as data, not only as prose');
    expect(result.structuredContent).toEqual({ result: 2.5 });

    story.and('the text block is still there for the model to read');
    expect(JSON.stringify(result.content)).toContain('2.5');

    story.table({
      label: 'What came back',
      columns: ['Field', 'Value'],
      rows: [
        ['structuredContent', JSON.stringify(result.structuredContent)],
        ['isError', String(result.isError ?? false)],
      ],
    });
  });

  it('reports a tool-level failure as a result, not a protocol error', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'isError is a result',
      markdown: [
        'Dividing by zero is a thing the *tool* could not do. The call itself was',
        'well-formed, so the answer is a result carrying `isError: true`. The model',
        'reads it, apologises, and tries something else.',
        '',
        'Throwing here would end the turn instead, and the model would learn',
        'nothing about what went wrong.',
      ].join('\n'),
    });

    story.given('a divide tool');
    story.when('it is asked to divide by zero');
    const result = await client.callTool({ name: 'divide', arguments: { a: 1, b: 0 } });

    story.then('the failure comes back as a readable result');
    expect(result.isError).toBe(true);

    story.and('the connection is still usable');
    const after = await client.callTool({ name: 'divide', arguments: { a: 4, b: 2 } });
    expect(after.structuredContent).toEqual({ result: 2 });
  });

  it('separates a bad argument from a tool that does not exist', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'The other half of the distinction',
      markdown: [
        'A bad argument is still a call the model made in good faith, so schema',
        'validation comes back as `isError` with a message naming the field. The',
        'model can correct itself and retry.',
        '',
        'A tool that does not exist is different: nothing about the request makes',
        'sense, so it is a JSON-RPC `-32601` and never reaches a handler.',
      ].join('\n'),
    });

    story.given('an add tool whose schema requires two numbers');
    story.when('a caller sends a word where a number belongs');
    const bad = await client.callTool({ name: 'add', arguments: { a: 'two', b: 3 } });

    story.then('validation fails as a readable result, naming the field');
    expect(bad.isError).toBe(true);
    expect(JSON.stringify(bad.content)).toContain('Invalid arguments');

    story.and('a tool that does not exist is a protocol error instead');
    await expect(client.callTool({ name: 'no_such_tool', arguments: {} })).rejects.toThrow();
  });
});

/**
 * 02 — Resources, as a story that proves itself.
 *
 * Resources are read, not called. The parts worth pinning: text and binary
 * travel differently, a template lists its instances, and a cache hint says
 * whether an answer may be held.
 */
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '../shared/connect';
import { serveHttp, type McpHttpServer } from '../shared/serve';
import { RESOURCE_URIS } from './constants';
import { buildServer } from './server';
import type { Client } from '@modelcontextprotocol/client';

const PORT = 8388;
const URL_ = `http://127.0.0.1:${PORT}/mcp`;

describe('02 — resources', () => {
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

  it('lists what it holds, and reads text back as text', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'Read, not called',
      markdown: [
        'A tool does something. A resource *is* something: the host reads it and',
        'decides what to put in the context window. That difference is why',
        'resources are addressed by URI rather than invoked by name.',
      ].join('\n'),
    });

    story.given('a server holding logs, status, docs and an image');
    const listed = await client.listResources();

    story.table({
      label: 'What the server holds',
      columns: ['URI', 'MIME type'],
      rows: listed.resources.map((r) => [r.uri, r.mimeType ?? '—']),
    });

    story.when('the log resource is read');
    const logs = await client.readResource({ uri: RESOURCE_URIS.APP_LOGS });

    story.then('it comes back as text on the contents entry');
    expect(logs.contents[0]).toHaveProperty('text');
    expect(listed.resources.length).toBeGreaterThan(0);
  });

  it('sends binary as base64 rather than pretending it is text', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'Binary resources',
      markdown: [
        'A PNG has no text form, so its contents entry carries `blob` instead of',
        '`text`. A client that assumed `text` would corrupt it silently, which is',
        'why the distinction is on the wire rather than left to convention.',
      ].join('\n'),
    });

    story.given('a 1x1 PNG published as a resource');
    story.when('it is read');
    const image = await client.readResource({ uri: RESOURCE_URIS.MCP_LOGO });

    story.then('it arrives as a blob, not as text');
    expect(image.contents[0]).toHaveProperty('blob');
    expect(image.contents[0]).not.toHaveProperty('text');
  });

  it('expands a template into the instances it can serve', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'Templates and their instances',
      markdown: [
        'A `ResourceTemplate` describes a family — `data://metrics/{team}.csv` —',
        'and supplies a `list` so a host can show the real instances instead of a',
        'pattern the user has to fill in.',
      ].join('\n'),
    });

    story.given('a metrics template with one entry per team');
    const templates = await client.listResourceTemplates();

    story.then('the template is advertised with its URI pattern');
    expect(templates.resourceTemplates.some((t) => t.uriTemplate.includes('{team}'))).toBe(true);

    story.and('a concrete instance reads back as CSV');
    const listed = await client.listResources();
    const metric = listed.resources.find((r) => r.uri.startsWith('data://metrics/'));
    expect(metric).toBeDefined();
    const csv = await client.readResource({ uri: metric!.uri });
    expect(csv.contents[0]).toHaveProperty('text');
  });
});

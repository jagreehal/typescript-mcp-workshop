/**
 * 15 — MCP Apps, as a story that proves itself.
 *
 * A tool can name a View, and the View is an ordinary resource declared up
 * front. That is the security argument: a host can fetch and review the
 * template at connect time rather than being handed markup mid-conversation.
 */
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '../shared/connect';
import { serveHttp, type McpHttpServer } from '../shared/serve';
import { UI_MIME_TYPE, VIEW_URI } from './constants';
import { buildServer } from './server';
import type { Client } from '@modelcontextprotocol/client';

const PORT = 8399;
const URL_ = `http://127.0.0.1:${PORT}/mcp`;

describe('15 — MCP Apps', () => {
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

  it('declares its View up front, so a host can review it before rendering', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'The template is a resource, not a payload',
      markdown: [
        'The tool names a `resourceUri` in `_meta.ui`, and that URI resolves to an',
        'ordinary resource with a `text/html;profile=mcp-app` mime type and a long',
        'cache hint.',
        '',
        'Handing markup back inside a tool result would mean a host rendering',
        'something it has never seen. Declaring it up front gives it a review',
        'window, and lets it cache the template instead of re-fetching per call.',
      ].join('\n'),
    });

    story.given('a show_sales tool that names a View');
    const tools = await client.listTools();
    const showSales = tools.tools.find((tool) => tool.name === 'show_sales');
    expect(showSales).toBeDefined();

    story.then('the tool points at a resource URI rather than carrying markup');
    const ui = (showSales?._meta as { ui?: { resourceUri?: string } } | undefined)?.ui;
    expect(ui?.resourceUri).toBe(VIEW_URI);

    story.and('that resource is declared, typed as an MCP App, and cacheable');
    const view = await client.readResource({ uri: VIEW_URI });
    expect(view.contents[0]?.mimeType).toBe(UI_MIME_TYPE);

    story.table({
      label: 'The View, as declared',
      columns: ['Property', 'Value'],
      rows: [
        ['resourceUri', String(ui?.resourceUri)],
        ['mimeType', String(view.contents[0]?.mimeType)],
      ],
    });
  });

  it('marks a button app-only, so it costs the model no tokens', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'visibility is a token-budget decision',
      markdown: [
        "`refresh_sales` exists for the View's refresh button, so it is declared",
        "`visibility: ['app']`. A host that honours that keeps it out of the tool",
        'list the model sees.',
        '',
        'The filtering is the host\'s job, not the server\'s — which is why the',
        'tool is still present on the wire here. What the server owes is an honest',
        'declaration, and that is what this pins.',
      ].join('\n'),
    });

    story.given('two tools, one for the model and one for the button');
    const tools = await client.listTools();
    const forModel = tools.tools.find((tool) => tool.name === 'show_sales');
    const forApp = tools.tools.find((tool) => tool.name === 'refresh_sales');

    story.then('each declares who it is for');
    const visibilityOf = (tool: typeof forModel) =>
      (tool?._meta as { ui?: { visibility?: string[] } } | undefined)?.ui?.visibility ?? [];
    expect(visibilityOf(forModel)).toContain('model');
    expect(visibilityOf(forApp)).toEqual(['app']);

    story.table({
      label: 'Who each tool is for',
      columns: ['Tool', 'Visibility'],
      rows: [
        ['show_sales', visibilityOf(forModel).join(', ')],
        ['refresh_sales', visibilityOf(forApp).join(', ')],
      ],
    });

    story.and('the app-only tool still works when the View calls it');
    const refreshed = await client.callTool({ name: 'refresh_sales', arguments: {} });
    expect(refreshed.isError ?? false).toBe(false);
  });

  it('returns data for the View to render, not the rendering itself', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'The tool still returns data',
      markdown: [
        'Calling the tool gives back structured data. The View is what turns it',
        'into a chart, which keeps the tool useful to a model that has no screen',
        'at all.',
      ].join('\n'),
    });

    story.given('the sales tool and its View');
    story.when('the tool is called');
    const result = await client.callTool({ name: 'show_sales', arguments: {} });

    story.then('it answers with data rather than HTML');
    expect(result.isError ?? false).toBe(false);
    expect(JSON.stringify(result)).not.toContain('<html');
  });
});

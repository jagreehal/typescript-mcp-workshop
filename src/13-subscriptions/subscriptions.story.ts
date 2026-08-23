/**
 * 13 — Subscriptions, as a story that proves itself.
 *
 * Two claims. The filter is negotiated, so a client learns what it will
 * actually receive instead of waiting for events that were never coming. And
 * the filter is enforced: an update to a URI nobody asked for is not delivered.
 */
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '../shared/connect';
import { serveHttp, type McpHttpServer } from '../shared/serve';
import { BUILD_LOG_URI, BUILD_STATUS_URI } from './constants';
import { buildServer } from './server';
import type { Client } from '@modelcontextprotocol/client';

const PORT = 8397;
const URL_ = `http://127.0.0.1:${PORT}/mcp`;

describe('13 — subscriptions', () => {
  let server: McpHttpServer;
  let client: Client;

  beforeAll(async () => {
    server = await serveHttp(buildServer, PORT);
    client = await connect(URL_, { capabilities: { elicitation: {} } });
  });
  afterAll(async () => {
    await client?.close();
    await server.close();
  });

  it('tells the client which parts of its filter were honoured', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'A negotiated filter, not a hopeful one',
      markdown: [
        'The client asks for tools-list changes, prompts-list changes, and updates',
        'to one resource. This server advertises no prompts capability, so that',
        'part of the request falls out of the acknowledged filter.',
        '',
        'The client learns this at subscribe time. The alternative is waiting',
        'forever for an event that was never going to fire, with nothing to say so.',
      ].join('\n'),
    });

    story.given('a server with tools and resources, but no prompts');
    story.when('a client asks to watch all three');
    const subscription = await client.listen({
      toolsListChanged: true,
      promptsListChanged: true,
      resourceSubscriptions: [BUILD_STATUS_URI],
    });

    story.then('the acknowledgement names what will actually be delivered');
    expect(subscription.honoredFilter).toBeDefined();

    story.table({
      label: 'Asked for, versus honoured',
      columns: ['Requested', 'Honoured'],
      rows: [
        ['toolsListChanged', String(Boolean(subscription.honoredFilter?.toolsListChanged))],
        ['promptsListChanged', String(Boolean(subscription.honoredFilter?.promptsListChanged))],
        [BUILD_STATUS_URI, String((subscription.honoredFilter?.resourceSubscriptions ?? []).length > 0)],
      ],
    });

    story.and('prompts fell out, because the server has none to change');
    expect(subscription.honoredFilter?.promptsListChanged ?? false).toBe(false);
  });

  it('delivers the resource that was asked for, and not the one that was not', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'The filter is enforced server-side',
      markdown: [
        'The build updates two resources on every stage: its status and its log.',
        'A client subscribed to the status only should never see the log, and',
        'proving that matters — a filter that leaks is a privacy bug, not just',
        'noise.',
      ].join('\n'),
    });

    const seen: string[] = [];
    client.setNotificationHandler('notifications/resources/updated', async (note) => {
      const params = note.params as { uri?: string };
      if (params.uri) seen.push(params.uri);
    });

    story.given('a client listening to the build status only');
    await client.listen({ resourceSubscriptions: [BUILD_STATUS_URI] });

    story.when('the server updates both the status and the log');
    server.handler.notify.resourceUpdated(BUILD_STATUS_URI);
    server.handler.notify.resourceUpdated(BUILD_LOG_URI);
    await new Promise((resolve) => setTimeout(resolve, 300));

    story.then('only the subscribed URI arrives');
    expect(seen).toContain(BUILD_STATUS_URI);

    story.and('the unsubscribed one never does');
    expect(seen).not.toContain(BUILD_LOG_URI);

    story.table({
      label: 'What the client received',
      columns: ['URI', 'Delivered'],
      rows: [
        [BUILD_STATUS_URI, seen.includes(BUILD_STATUS_URI) ? 'yes' : 'no'],
        [BUILD_LOG_URI, seen.includes(BUILD_LOG_URI) ? 'yes' : 'no'],
      ],
    });
  });
});

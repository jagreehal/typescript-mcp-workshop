/**
 * 03 — Prompts, as a story that proves itself.
 *
 * A prompt is a template the *user* chooses, not something the model calls.
 * The part with real teeth is `completable`: it is what lets a host offer
 * valid values while someone is typing, and it is easy to break by accident.
 */
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '../shared/connect';
import { serveHttp, type McpHttpServer } from '../shared/serve';
import { buildServer } from './server';
import type { Client } from '@modelcontextprotocol/client';

const PORT = 8386;
const URL_ = `http://127.0.0.1:${PORT}/mcp`;

describe('03 — prompts', () => {
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

  it('renders a template into messages the model can be given', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'User-chosen, not model-called',
      markdown: [
        'Tools are for the model to invoke. Prompts are for the person: a slash',
        'command, a menu item, a button. The server owns the wording, so it can',
        'be improved without every client shipping a new build.',
      ].join('\n'),
    });

    story.given('a greeting prompt taking a name and a time of day');
    const listed = await client.listPrompts();
    story.table({
      label: 'Prompts on offer',
      columns: ['Name', 'Description'],
      rows: listed.prompts.map((p) => [p.name, p.description ?? '—']),
    });

    story.when('it is rendered for Ada in the morning');
    const rendered = await client.getPrompt({
      name: 'greeting',
      arguments: { name: 'Ada', timeOfDay: 'morning' },
    });

    story.then('the server returns finished messages, not a template');
    expect(rendered.messages.length).toBeGreaterThan(0);
    expect(JSON.stringify(rendered.messages)).toContain('Ada');
  });

  it('completes an argument while the user is still typing', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'Why completable is worth the trouble',
      markdown: [
        'Wrapping an argument in `completable()` registers a',
        '`completion/complete` handler, so a host can offer the valid values',
        'as someone types instead of making them guess.',
        '',
        'The trap the module calls out: `.describe()` has to go **inside**',
        '`completable()`. Chain it afterwards and you get a fresh schema with the',
        'marker gone, no handler is registered, and completion fails with',
        '`-32601`. This story is what would catch that.',
      ].join('\n'),
    });

    story.given('a code_review prompt whose language argument is completable');
    story.when('a host asks what "ty" could become');
    const completion = await client.complete({
      ref: { type: 'ref/prompt', name: 'code_review' },
      argument: { name: 'language', value: 'ty' },
    });

    story.then('the server answers with the matching values');
    expect(completion.completion.values).toContain('typescript');

    story.table({
      label: 'Suggestions for "ty"',
      columns: ['Value'],
      rows: completion.completion.values.map((v) => [v]),
    });
  });
});

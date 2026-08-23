/**
 * 14 — Tasks, as a story that proves itself.
 *
 * Long work used to mean holding a connection open and hoping. A task hands
 * back a handle immediately and the caller polls, which is the same shape as
 * the rest of 2026-07-28: nothing held, any instance can answer.
 */
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '../shared/connect';
import { serveHttp, type McpHttpServer } from '../shared/serve';
import { buildServer } from './server';
import type { Client } from '@modelcontextprotocol/client';

const PORT = 8398;
const URL_ = `http://127.0.0.1:${PORT}/mcp`;

/** The job handle, read from structuredContent rather than parsed out of prose. */
const jobIdOf = (r: { structuredContent?: unknown }): string => {
  const structured = r.structuredContent;
  return structured && typeof structured === 'object' && 'jobId' in structured
    ? String((structured as { jobId: unknown }).jobId)
    : '';
};

const textOf = (r: { content?: unknown }) =>
  Array.isArray(r.content) && r.content[0] && typeof r.content[0] === 'object' && 'text' in r.content[0]
    ? String((r.content[0] as { text: unknown }).text)
    : '';

/** Poll until the job leaves `working`, or give up. */
async function settle(client: Client, jobId: string, tries = 30): Promise<string> {
  for (let attempt = 0; attempt < tries; attempt++) {
    const status = textOf(await client.callTool({ name: 'refund_status', arguments: { jobId } }));
    if (!status.includes('working')) return status;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('job never settled');
}

describe('14 — tasks', () => {
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

  it('returns a handle immediately instead of holding the call open', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'Long work, short requests',
      markdown: [
        'The tool starts the work and returns a job handle. The call is over in',
        'milliseconds, so nothing is pinned to an instance while a payment',
        'processor takes its time.',
      ].join('\n'),
    });

    story.mermaid({
      title: 'Start, then poll',
      code: [
        'sequenceDiagram',
        '  participant C as Client',
        '  participant S as Server',
        '  C->>S: startRefund',
        '  S-->>C: job handle (call ends here)',
        '  loop until terminal',
        '    C->>S: refund_status(jobId)',
        '    S-->>C: working / completed / failed',
        '  end',
      ].join('\n'),
    });

    story.given('a refund that takes longer than a request should');
    story.when('it is started');
    const startReply = await client.callTool({ name: 'startRefund', arguments: { orderId: 'ord_1001', amount: 100 } });
    const started = textOf(startReply);
    const jobId = jobIdOf(startReply);

    story.then('a handle comes back straight away');
    expect(jobId).toBeTruthy();

    story.and('polling it eventually reports a terminal state');
    const settled = await settle(client, jobId);
    expect(settled).toContain('completed');

    story.table({
      label: 'The job, start to finish',
      columns: ['Step', 'Reply'],
      rows: [
        ['startRefund', started],
        ['final status', settled],
      ],
    });
  });

  it('reports a business failure as an outcome, not an exception', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'failed is a status, not a throw',
      markdown: [
        'A refund over the daily float is a real answer, so the job reaches',
        '`failed` and the caller learns why by polling like any other state. An',
        'exception would have nowhere to go: the call that started the work',
        'returned long ago.',
      ].join('\n'),
    });

    story.given('a refund larger than the float allows');
    story.when('it runs to completion');
    const jobId = jobIdOf(
      await client.callTool({ name: 'startRefund', arguments: { orderId: 'ord_1002', amount: 5000 } }),
    );
    const settled = await settle(client, jobId);

    story.then('the job ends failed, carrying the reason');
    expect(settled).toContain('failed');
    expect(settled).toMatch(/float|declined/i);
  });

  it('treats cancellation as a request, not a guarantee', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'A terminal job stays put',
      markdown: [
        'Cancelling asks the worker to stop. A job that already finished cannot',
        'un-finish, so cancellation reports what actually happened rather than',
        'pretending it succeeded.',
      ].join('\n'),
    });

    story.given('a job that has already completed');
    const jobId = jobIdOf(await client.callTool({ name: 'startRefund', arguments: { orderId: 'ord_1003', amount: 10 } }));
    await settle(client, jobId);

    story.when('someone cancels it anyway');
    const cancelled = textOf(await client.callTool({ name: 'cancel_refund', arguments: { jobId } }));

    story.then('it says the job was already done rather than claiming a cancel');
    expect(cancelled).toMatch(/already/i);

    story.and('an unknown job is an error result, not a crash');
    const unknown = await client.callTool({ name: 'cancel_refund', arguments: { jobId: 'job_nope' } });
    expect(unknown.isError).toBe(true);
  });
});

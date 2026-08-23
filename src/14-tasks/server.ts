import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { isEntrypoint } from '../shared/entrypoint';
import { banner, serveHttp } from '../shared/serve';
import { createInMemoryStore } from '../shared/store';
import { JOB_TTL_MS, POLL_INTERVAL_MS, PORT } from './constants';

/**
 * Long-running work, without holding a connection open.
 *
 * 2026-07-28 moved tasks out of the core protocol and into an official
 * extension, `io.modelcontextprotocol/tasks` (SEP-2663). The redesign dropped
 * the blocking `tasks/result` for polling via `tasks/get`, added `tasks/update`
 * for mid-flight input, and removed `tasks/list`.
 *
 * The shape it standardises is the one below: a call that would block returns a
 * **durable handle** instead, and the caller polls it. Read `startRefund` as
 * `tools/call` answering `resultType: "task"`, `refund_status` as `tasks/get`,
 * and `cancel_refund` as `tasks/cancel`. The status vocabulary is the
 * extension's, unchanged: working, input_required, completed, failed,
 * cancelled — the first two non-terminal, the last three terminal.
 *
 * ⚠️ These are ordinary tools, not the extension's methods, and that is
 * deliberate: the TypeScript SDK v2.0.0 ships the task wire *types* but no
 * runtime for them. `setRequestHandler('tasks/get', …)` registers nothing the
 * dispatcher will route (`-32601`), and returning `resultType: "task"` from a
 * `tools/call` handler is rejected by the result validator on both ends. See
 * this module's README. Until the SDK carries the extension, tools are how you
 * ship this, and the model drives them perfectly well — a handle passed as an
 * argument is the same idiom module 08 uses for carts.
 *
 * Why not just block for 30 seconds?
 *
 *  - Intermediaries time out. A held connection is a bet on every proxy
 *    between you and the client.
 *  - A handle survives a crash. The client restarts and polls the same id;
 *    with a shared store, any instance answers.
 *  - Progress becomes visible. `working` with a status message beats silence.
 *  - It stays stateless. Each poll is an independent request, routable
 *    anywhere — the same property the whole revision is built on.
 */

type JobStatus = 'working' | 'completed' | 'failed' | 'cancelled';

type Job = {
  id: string;
  status: JobStatus;
  statusMessage: string;
  createdAt: number;
  expiresAt: number;
  /** Present once `completed`. */
  result?: string;
  /** Present once `failed`. */
  error?: string;
};

/**
 * The same store module 08 mints cart handles against
 * ([`shared/store.ts`](../shared/store.ts)), with a different TTL.
 *
 * A job must outlive the request that created it: the per-request `McpServer`
 * instance is closed before the first poll arrives, so nothing about a job can
 * live on the server object. Across a fleet it must outlive the *instance*
 * too, which is what makes this a store rather than a variable.
 */
const jobs = createInMemoryStore<Job>({ ttlMs: JOB_TTL_MS });

/**
 * Fakes an external system: settles the job after a while.
 *
 * Every step re-reads the job before writing it. That is not ceremony — the
 * background worker and the request handlers are separate readers of shared
 * state, and against a real store the object this closure captured went stale
 * the moment anything else wrote. Read, modify, write, every time.
 */
function runInBackground(jobId: string, amount: number): void {
  const advance = async (mutate: (job: Job) => void): Promise<void> => {
    const job = await jobs.get(jobId);
    // Gone means expired, or cancelled and swept. Either way there is nothing
    // left to advance, and a background worker must not resurrect it.
    if (!job || job.status !== 'working') return;
    mutate(job);
    await jobs.set(jobId, job);
  };

  setTimeout(() => {
    void advance((job) => {
      job.statusMessage = 'contacting the payment processor';
    });
  }, 500);

  setTimeout(() => {
    void advance((job) => {
      // A refund over the float fails. `failed` is a real outcome rather than
      // an exception, and the caller learns it by polling like any other.
      if (amount > 500) {
        job.status = 'failed';
        job.statusMessage = 'declined';
        job.error = `refund of £${amount} exceeds the daily float`;
        return;
      }
      job.status = 'completed';
      job.statusMessage = 'settled';
      job.result = `refunded £${amount}`;
    });
  }, 1400);
}

export function buildServer() {
  const server = new McpServer(
    { name: 'tasks-demo', version: '2.0.0' },
    {
      capabilities: {
        tools: {},
        // How a server advertises an extension it speaks (SEP-2663 negotiation
        // rides on the `extensions` field added to capabilities in this
        // revision). A client reads it from `server/discover`. It is declared
        // here to show the shape; the SDK routes no `tasks/*` method yet.
        extensions: { 'io.modelcontextprotocol/tasks': {} },
      },
    },
  );

  server.registerTool(
    'startRefund',
    {
      title: 'Start a refund',
      description:
        'Begin a refund. Returns a job handle immediately — poll refund_status with it.',
      inputSchema: z.object({
        orderId: z.string().describe('Which order to refund'),
        amount: z.number().describe('Amount in pounds'),
      }),
      // Structured output so the model gets the handle as a field rather than
      // having to scrape it out of prose.
      outputSchema: z.object({
        jobId: z.string(),
        status: z.string(),
        pollAfterMs: z.number(),
      }),
      annotations: { readOnlyHint: false, idempotentHint: false },
    },
    async ({ orderId, amount }) => {
      const job: Job = {
        id: `job_${randomUUID().slice(0, 8)}`,
        status: 'working',
        statusMessage: `queued refund for ${orderId}`,
        createdAt: Date.now(),
        expiresAt: Date.now() + JOB_TTL_MS,
      };
      // Durable BEFORE the response goes out. Reverse the order and a client
      // that polls immediately gets "unknown job" for something you told it
      // exists. The store expires it on the same TTL, so nothing here sweeps.
      await jobs.set(job.id, job);
      runInBackground(job.id, amount);

      const structured = {
        jobId: job.id,
        status: job.status,
        pollAfterMs: POLL_INTERVAL_MS,
      };
      return {
        structuredContent: structured,
        content: [
          {
            type: 'text',
            text: `refund started — job ${job.id}, poll refund_status in ${POLL_INTERVAL_MS}ms`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'refund_status',
    {
      title: 'Refund status',
      description: 'Poll a refund job by its handle',
      inputSchema: z.object({ jobId: z.string().describe('Handle from startRefund') }),
      outputSchema: z.object({
        status: z.string(),
        statusMessage: z.string(),
        result: z.string().optional(),
        error: z.string().optional(),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ jobId }) => {
      const job = await jobs.get(jobId);
      if (!job) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown or expired job: ${jobId}` }],
        };
      }

      const structured = {
        status: job.status,
        statusMessage: job.statusMessage,
        ...(job.result !== undefined && { result: job.result }),
        ...(job.error !== undefined && { error: job.error }),
      };
      return {
        structuredContent: structured,
        content: [
          { type: 'text', text: `${job.status}: ${job.result ?? job.error ?? job.statusMessage}` },
        ],
      };
    },
  );

  server.registerTool(
    'cancel_refund',
    {
      title: 'Cancel a refund',
      description: 'Ask for a refund job to stop. Cooperative — it may finish anyway.',
      inputSchema: z.object({ jobId: z.string() }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ jobId }) => {
      const job = await jobs.get(jobId);
      if (!job) {
        return { isError: true, content: [{ type: 'text', text: `Unknown job: ${jobId}` }] };
      }
      // Cancellation is a request, not a guarantee: a terminal job stays put.
      if (job.status !== 'working') {
        return {
          content: [{ type: 'text', text: `${jobId} already ${job.status} — nothing to cancel` }],
        };
      }
      job.status = 'cancelled';
      job.statusMessage = 'cancelled by the caller';
      // The write is what stops the background worker, which checks the
      // stored status rather than the object it started with.
      await jobs.set(jobId, job);
      return { content: [{ type: 'text', text: `${jobId} cancelled` }] };
    },
  );

  return server;
}

if (isEntrypoint(import.meta.url)) {
  await serveHttp(buildServer, PORT);
  banner('⏳ Tasks MCP server', PORT, [
    'tools     startRefund, refund_status, cancel_refund',
    'shape     the io.modelcontextprotocol/tasks extension, as tools',
    'note      SDK v2.0.0 routes no tasks/* method — see this module README',
  ]);
}

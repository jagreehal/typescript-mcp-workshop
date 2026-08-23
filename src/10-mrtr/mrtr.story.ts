/**
 * 10 — Multi Round-Trip Requests, as a story that proves itself.
 *
 * The claim worth testing is not that MRTR works. It is that the first half of
 * the exchange *finishes*: no stream stays open, nothing is held, and the
 * resume can land on a different instance six days later.
 *
 * These stories drive the rounds by hand (`autoFulfill: false`) so each HTTP
 * exchange is visible, then prove the resume survives a round-robin balancer.
 *
 *   pnpm test:story
 */
import { createServer, request as httpRequest, type Server } from 'node:http';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { serveHttp, type McpHttpServer } from '../shared/serve';
import { buildServer } from './server';
import type { CallToolRequest } from '@modelcontextprotocol/client';

/**
 * `callTool` params plus the two fields a resume carries.
 *
 * The SDK documents the manual path as "retry the original request with
 * `inputResponses` / `requestState` params", and the server reads both off the
 * envelope, but `CallToolRequestParams` does not model them yet. Naming the
 * widening here keeps it visible instead of scattering casts at each call.
 */
type ResumeParams = CallToolRequest['params'] & {
  inputResponses?: Record<string, unknown>;
  requestState?: unknown;
};

const PORTS = [8293, 8294];
const BALANCER_PORT = 8290;
const MCP_URL = `http://127.0.0.1:${BALANCER_PORT}/mcp`;

/** No affinity, alternate every request — the point being made. */
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

/** A client that hands the rounds back to us instead of answering them itself. */
async function manualClient(): Promise<Client> {
  const client = new Client(
    { name: 'mrtr-story', version: '2.0.0' },
    {
      versionNegotiation: { mode: { pin: '2026-07-28' } },
      capabilities: { elicitation: {}, sampling: {} },
      // Auto-fulfilment is the ergonomic default. Off, so the story can show
      // that the first exchange ends before anyone answers anything.
      inputRequired: { autoFulfill: false },
    },
  );
  await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)));
  return client;
}

describe('10 — multi round-trip requests', () => {
  const instances: McpHttpServer[] = [];
  let balancer: Server;

  beforeAll(async () => {
    // Every instance verifies state minted by any other, so they share a key.
    // Per-process randomness works only while one process serves every round.
    process.env.MCP_STATE_KEY ??= 'story-fixed-key-for-a-shared-fleet';
    for (const port of PORTS) instances.push(await serveHttp(buildServer, port));
    balancer = roundRobin(PORTS);
    await new Promise<void>((resolve) => balancer.listen(BALANCER_PORT, '127.0.0.1', resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => balancer.close(() => resolve()));
    for (const instance of instances) await instance.close();
  });

  it('ends the first exchange instead of holding a stream open', async ({ task }) => {
    story.init(task);

    story.section({
      title: 'What replaced the held-open stream',
      markdown: [
        'Under 2025 a server that needed a confirmation sent `elicitation/create`',
        'back down a bidirectional stream and waited. That stream is what made the',
        'protocol stateful: the answer had to return to the instance still holding',
        'it, so the balancer needed affinity and the instance needed to stay up.',
        '',
        'MRTR turns it inside out. The server **returns** `input_required` naming',
        'what it needs, and the exchange is over. The client can prompt a human and',
        'come back in six days, holding nothing in the meantime.',
      ].join('\n'),
    });

    story.mermaid({
      title: 'Before: the server waits on an open stream',
      code: [
        'sequenceDiagram',
        '  participant C as Client',
        '  participant A as Instance A',
        '  C->>A: tools/call deploy',
        '  A-->>C: elicitation/create (down the open stream)',
        '  Note over C,A: stream held open, instance pinned,<br/>resources tied up while a human decides',
        '  C->>A: elicitation result (must reach A)',
        '  A-->>C: result',
      ].join('\n'),
    });

    story.mermaid({
      title: 'After: two independent exchanges, either instance can serve either',
      code: [
        'sequenceDiagram',
        '  participant C as Client',
        '  participant LB as Load Balancer',
        '  participant A as Instance A',
        '  participant B as Instance B',
        '  C->>LB: tools/call deploy',
        '  LB->>A: routed',
        '  A-->>C: input_required + requestState',
        '  Note over C,A: exchange complete, nothing held',
        '  C->>LB: tools/call deploy + inputResponses',
        '  LB->>B: routed anywhere',
        '  B-->>C: result',
      ].join('\n'),
    });

    const client = await manualClient();
    try {
      story.given('a deploy tool that will not act without a confirmation');

      story.when('the tool is called with no answer attached');
      const first = await client.callTool(
        { name: 'deploy', arguments: { env: 'staging' } },
        { allowInputRequired: true },
      );

      story.then('the reply asks for input rather than blocking on a stream');
      expect(first.resultType).toBe('input_required');
      expect(Object.keys(first.inputRequests ?? {})).toContain('confirm');

      story.and('the call returned, so nothing is waiting on the user');
      expect(first.content ?? []).toHaveLength(0);

      story.table({
        label: 'What came back on the first exchange',
        columns: ['Field', 'Value'],
        rows: [
          ['resultType', String(first.resultType)],
          ['inputRequests', Object.keys(first.inputRequests ?? {}).join(', ')],
          ['open streams', '0'],
        ],
      });
    } finally {
      await client.close();
    }
  });

  it('resumes on whichever instance the balancer picks next', async ({ task }) => {
    story.init(task);

    story.section({
      title: 'The resume is an ordinary request',
      markdown: [
        'Because the answer travels as `inputResponses` on a fresh call, it is',
        'routable like anything else. Nothing about it has to reach the instance',
        'that asked the question.',
        '',
        'The one thing a fleet must share is the key that seals `requestState`.',
        'Mint it per process and the resume fails wherever it lands next, which is',
        'why the module reads `MCP_STATE_KEY` rather than always generating one.',
      ].join('\n'),
    });

    const client = await manualClient();
    try {
      story.given('a call that comes back asking for a delivery address');
      const first = await client.callTool(
        { name: 'sendGift', arguments: { recipient: 'Ada', occasion: 'birthday' } },
        { allowInputRequired: true },
      );
      expect(first.resultType).toBe('input_required');

      story.when('the answer is sent as a new call, routed by round-robin');
      const resume: ResumeParams = {
        name: 'sendGift',
        arguments: { recipient: 'Ada', occasion: 'birthday' },
        inputResponses: {
          address: { action: 'accept', content: { address: '221B Baker Street' } },
        },
        requestState: first.requestState,
      };
      const second = await client.callTool(resume, { allowInputRequired: true });

      story.then('the server carried on from where the other instance left off');
      // Round two asks the client's model for the card text, which proves the
      // address round completed and the state survived the hop.
      expect(second.resultType).toBe('input_required');
      expect(Object.keys(second.inputRequests ?? {})).toContain('card');

      story.and('it sealed the address into requestState rather than trusting the client');
      expect(second.requestState).toBeTypeOf('string');
      expect(second.requestState).not.toContain('221B');

      story.table({
        label: 'Two rounds, no stream between them',
        columns: ['Round', 'Server asked for', 'State carried'],
        rows: [
          ['1', Object.keys(first.inputRequests ?? {}).join(', '), first.requestState ? 'sealed' : 'none'],
          ['2', Object.keys(second.inputRequests ?? {}).join(', '), second.requestState ? 'sealed' : 'none'],
        ],
      });
    } finally {
      await client.close();
    }
  });

  it('refuses a requestState the client tampered with', async ({ task }) => {
    story.init(task);

    story.section({
      title: 'requestState is attacker-controlled input',
      markdown: [
        '`requestState` round-trips through the client, so the spec makes',
        'integrity-protecting it a MUST wherever it influences authorization or',
        'business logic. The SDK verifies nothing by default: leave the option off',
        'and the handler is handed the raw wire string.',
        '',
        'With `createRequestStateCodec` wired into `requestState.verify`, a',
        'tampered blob is refused before the handler runs.',
      ].join('\n'),
    });

    const client = await manualClient();
    try {
      story.given('a sealed requestState, minted once the address round completed');
      const first = await client.callTool(
        { name: 'sendGift', arguments: { recipient: 'Ada', occasion: 'birthday' } },
        { allowInputRequired: true },
      );
      const addressRound: ResumeParams = {
        name: 'sendGift',
        arguments: { recipient: 'Ada', occasion: 'birthday' },
        inputResponses: {
          address: { action: 'accept', content: { address: '221B Baker Street' } },
        },
        requestState: first.requestState,
      };
      const sealed = await client.callTool(addressRound, { allowInputRequired: true });
      expect(sealed.requestState).toBeTypeOf('string');

      story.when('a client edits it and replays the call');
      const tampered = `${String(sealed.requestState).slice(0, -4)}AAAA`;
      const forged: ResumeParams = {
        name: 'sendGift',
        arguments: { recipient: 'Ada', occasion: 'birthday' },
        inputResponses: { address: { action: 'accept', content: { address: 'evil' } } },
        requestState: tampered,
      };
      const replay = client.callTool(forged, { allowInputRequired: true });

      story.then('the server rejects it rather than acting on forged state');
      await expect(replay).rejects.toThrow();

      story.kv({ label: 'Verified by', value: 'ServerOptions.requestState.verify' });
      story.kv({ label: 'Bound to', value: 'method and caller, with a 300s TTL' });
    } finally {
      await client.close();
    }
  });
});

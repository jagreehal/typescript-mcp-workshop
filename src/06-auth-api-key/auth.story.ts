/**
 * 06 — API-key auth, as a story that proves itself.
 *
 * Two claims worth pinning. The SDK verifies nothing on your behalf, so the
 * gate is yours to write. And identity is established per *request*, because
 * 2026-07-28 has no connection to attach it to — there is no authenticated
 * session to leak between callers.
 */
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '../shared/connect';
import { serveHttp, type McpHttpServer } from '../shared/serve';
import { ALICE_API_KEY, BOB_API_KEY } from './constants';
import { authenticate, buildServer } from './server';

const PORT = 8385;
const URL_ = `http://127.0.0.1:${PORT}/mcp`;

const asKey = (key: string) => connect(URL_, { headers: { authorization: `Bearer ${key}` } });

describe('06 — API-key auth', () => {
  let server: McpHttpServer;

  beforeAll(async () => {
    server = await serveHttp((ctx) => buildServer(ctx.authInfo), PORT, { authenticate });
  });
  afterAll(async () => {
    await server.close();
  });

  it('turns a key into an identity the tools can see', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'The SDK verifies nothing',
      markdown: [
        '`authenticate` runs before the handler and its return value reaches the',
        'factory as `ctx.authInfo`. The SDK never derives identity from headers',
        'itself — strictly pass-through, so the checking is yours and is visible',
        'in one place.',
      ].join('\n'),
    });

    story.given("Alice's API key");
    story.when('she asks the server who she is');
    const alice = await asKey(ALICE_API_KEY);
    try {
      const me = await alice.callTool({ name: 'whoami', arguments: {} });

      story.then('the server answers with her identity, not a generic one');
      expect(JSON.stringify(me.content)).toContain('alice');
    } finally {
      await alice.close();
    }
  });

  it('refuses a key it does not know', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'A bad key never reaches a tool',
      markdown: [
        '`authenticate` answers 401 itself and returns undefined, so the request',
        'stops at the gate. Nothing downstream has to remember to check.',
      ].join('\n'),
    });

    story.given('a key that was never issued');
    story.when('a client presents it');
    story.then('the connection is refused before any tool runs');
    await expect(asKey('fk_live_not_a_real_key')).rejects.toThrow();
  });

  it('enforces a scope the SDK knows nothing about', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'Scopes are yours to enforce',
      markdown: [
        'Alice holds `read`; Bob holds `read` and `write`. The SDK has no concept',
        'of either — `requireScope` in this module is the whole mechanism, and a',
        'refusal is an `isError` result so the model can explain itself rather',
        'than the turn dying.',
      ].join('\n'),
    });

    story.given('Alice, who may read but not write');
    const alice = await asKey(ALICE_API_KEY);
    const bob = await asKey(BOB_API_KEY);
    try {
      story.when('she tries to add a note');
      const denied = await alice.callTool({ name: 'addNote', arguments: { text: 'hello' } });

      story.then('the guard refuses her, in a result she can read');
      expect(denied.isError).toBe(true);
      expect(JSON.stringify(denied.content)).toContain('missing scope');

      story.and('Bob, who holds write, is allowed through the same tool');
      const allowed = await bob.callTool({ name: 'addNote', arguments: { text: 'hello' } });
      expect(allowed.isError ?? false).toBe(false);

      story.table({
        label: 'Same tool, two callers',
        columns: ['Caller', 'Scopes', 'addNote'],
        rows: [
          ['Alice', 'read', 'refused'],
          ['Bob', 'read, write', 'allowed'],
        ],
      });
    } finally {
      await alice.close();
      await bob.close();
    }
  });

  it('keeps two callers apart, with no session to confuse them', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'Identity per request, not per connection',
      markdown: [
        'Under a stateful protocol, identity attaches to a session, and a bug in',
        'session handling leaks one user into another. 2026-07-28 has no session,',
        'so every request re-establishes who is asking.',
      ].join('\n'),
    });

    story.given('Alice and Bob, each with their own key');
    const alice = await asKey(ALICE_API_KEY);
    const bob = await asKey(BOB_API_KEY);
    try {
      story.when('both ask who they are, over separate connections');
      const [a, b] = await Promise.all([
        alice.callTool({ name: 'whoami', arguments: {} }),
        bob.callTool({ name: 'whoami', arguments: {} }),
      ]);

      story.then('each is told about themselves');
      expect(JSON.stringify(a.content)).toContain('alice');
      expect(JSON.stringify(b.content)).toContain('bob');

      story.table({
        label: 'Who each caller was told they are',
        columns: ['Key', 'Answer'],
        rows: [
          ['Alice', JSON.stringify(a.content).slice(0, 60)],
          ['Bob', JSON.stringify(b.content).slice(0, 60)],
        ],
      });
    } finally {
      await alice.close();
      await bob.close();
    }
  });
});

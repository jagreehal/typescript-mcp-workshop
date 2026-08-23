/**
 * 05 — Multiple servers, as a story that proves itself.
 *
 * Two independent servers, one agent. The thing worth pinning is that they
 * stay independent: names are namespaced so two servers can both offer a
 * `getBalance` without colliding, and one being down does not take the other
 * with it.
 */
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '../shared/connect';
import { serveHttp, type McpHttpServer } from '../shared/serve';
import { buildServer as buildPayments } from './payment-server';
import { buildServer as buildUsers } from './user-server';
import { users as fixture } from './users';
import type { Client } from '@modelcontextprotocol/client';

const USER_PORT = 8382;
const PAYMENT_PORT = 8383;

describe('05 — multiple servers', () => {
  let users: McpHttpServer;
  let payments: McpHttpServer;
  let userClient: Client;
  let paymentClient: Client;

  beforeAll(async () => {
    users = await serveHttp(buildUsers, USER_PORT);
    payments = await serveHttp(buildPayments, PAYMENT_PORT);
    userClient = await connect(`http://127.0.0.1:${USER_PORT}/mcp`);
    paymentClient = await connect(`http://127.0.0.1:${PAYMENT_PORT}/mcp`);
  });
  afterAll(async () => {
    await userClient?.close();
    await paymentClient?.close();
    await users.close();
    await payments.close();
  });

  it('keeps two servers' + ' catalogs separate', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'One agent, two servers',
      markdown: [
        'Each server is reached over its own connection and owns its own catalog.',
        'The host is what stitches them into one tool list for the model, usually',
        'by prefixing names, which is why two servers can both publish a',
        '`getBalance` without either knowing about the other.',
      ].join('\n'),
    });

    story.given('a user server and a payment server');
    const userListing = await userClient.listTools();
    const paymentListing = await paymentClient.listTools();
    const userTools = userListing.tools.map((t) => t.name);
    const paymentTools = paymentListing.tools.map((t) => t.name);

    story.table({
      label: 'Who offers what',
      columns: ['Server', 'Tools'],
      rows: [
        ['users', userTools.join(', ')],
        ['payments', paymentTools.join(', ')],
      ],
    });

    story.then('neither catalog leaks into the other');
    expect(userTools).toContain('listUsers');
    expect(paymentTools).not.toContain('listUsers');
    expect(paymentTools).toContain('getBalance');
    expect(userTools).not.toContain('getBalance');
  });

  it('carries an id from one server to the other', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'The agent is the join',
      markdown: [
        'Neither server knows the other exists. The agent looks a user up by',
        'email on one, then asks the other for that id’s balance. The id is the',
        'only thing that crosses, and it crosses as a tool argument the model',
        'can see.',
      ].join('\n'),
    });

    story.given('a user who exists on the user server');
    const known = fixture[0]!;
    const listed = await userClient.callTool({ name: 'listUsers', arguments: {} });
    expect(JSON.stringify(listed.content)).toContain(known.email);

    story.when('their id is looked up and handed to the payment server');
    const lookup = await userClient.callTool({
      name: 'getUserIdByEmail',
      arguments: { email: known.email },
    });
    const userId = JSON.stringify(lookup.content).includes(known.id) ? known.id : '';
    expect(userId).toBe(known.id);

    const balance = await paymentClient.callTool({
      name: 'getBalance',
      arguments: { userId },
    });

    story.then('the payment server answers for that id');
    expect(balance.isError ?? false).toBe(false);

    story.table({
      label: 'What crossed between the servers',
      columns: ['Step', 'Server', 'Value'],
      rows: [
        ['listUsers', 'users', known.email],
        ['getUserIdByEmail', 'users', userId],
        ['getBalance', 'payments', JSON.stringify(balance.content).slice(0, 50)],
      ],
    });
  });

  it('survives one server going away', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'Independent failure domains',
      markdown: [
        'Separate connections mean separate blast radius. Losing the payment',
        'server should cost the agent its payment tools and nothing else — the',
        'user server has no idea anything happened.',
      ].join('\n'),
    });

    story.given('both servers running');
    story.when('the payment server stops');
    await paymentClient.close();
    await payments.close();

    story.then('the user server keeps answering');
    const stillUp = await userClient.callTool({ name: 'listUsers', arguments: {} });
    expect(stillUp.isError ?? false).toBe(false);
  });
});

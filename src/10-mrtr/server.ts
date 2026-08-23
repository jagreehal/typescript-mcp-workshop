import { randomBytes } from 'node:crypto';
import {
  acceptedContent,
  createRequestStateCodec,
  inputRequired,
  inputResponse,
  McpServer,
} from '@modelcontextprotocol/server';
import { z } from 'zod';
import { isEntrypoint } from '../shared/entrypoint';
import { banner, serveHttp } from '../shared/serve';
import { PORT } from './constants';

/**
 * Multi Round-Trip Requests (MRTR, SEP-2322).
 *
 * The problem: a tool sometimes needs something from the user mid-call — a
 * confirmation, a missing parameter, a model completion. Under 2025 the server
 * sent a `elicitation/create` or `sampling/createMessage` request *back down* a
 * held-open bidirectional stream. That stream is exactly what made the protocol
 * stateful, and it is gone.
 *
 * The replacement is inside-out: the server RETURNS `resultType:
 * "input_required"` naming what it needs, and the client retries the original
 * call with the answers attached in `inputResponses`. No open stream, no
 * session — the exchange survives a load balancer.
 *
 * The consequence for handler code: **a handler runs more than once per logical
 * call.** Write it as a resumable state machine — check what you already have,
 * ask for what you don't. `acceptedContent()` is the "do I have it yet?" read.
 */

type CarriedState = { address: string };

/**
 * `requestState` round-trips through the client and comes back as
 * ATTACKER-CONTROLLED INPUT. The spec makes integrity-protecting it a MUST for
 * state that influences authorization, resource access or business logic, and
 * the SDK verifies nothing by default — leave the option off and
 * `ctx.mcpReq.requestState()` hands you the raw wire string.
 *
 * `createRequestStateCodec` is the SDK's HMAC helper: `mint` seals, `verify`
 * drops straight into `ServerOptions.requestState.verify`, and it adds a TTL
 * and a context binding for free. Wire it up and the handler reads its
 * *verified* payload through the typed accessor with no second decode.
 */
export const stateCodec = createRequestStateCodec<CarriedState>({
  // Per-process random works only because one process serves every round here.
  // Across a fleet, every instance needs the same key — it belongs in your
  // secrets manager, next to your JWT signing key.
  key: process.env.MCP_STATE_KEY ?? randomBytes(32),
  ttlSeconds: 300,
  // Bind the state to the method and the caller: state minted for one
  // principal is rejected when echoed by another.
  bind: (ctx) => `${ctx.mcpReq.method}\0${ctx.http?.authInfo?.clientId ?? ''}`,
});

export const deployments: string[] = [];

/** Sampling content is one block, or several on the tool-augmented result. */
function textOf(content: unknown): string {
  const blocks = Array.isArray(content) ? content : [content];
  const text = blocks
    .filter((block): block is { type: 'text'; text: string } => {
      return typeof block === 'object' && block !== null && (block as { type?: string }).type === 'text';
    })
    .map((block) => block.text)
    .join('\n');
  return text || '(no message)';
}

export function buildServer() {
  const server = new McpServer(
    { name: 'mrtr-demo', version: '2.0.0' },
    {
      capabilities: { tools: {} },
      // Runs before any handler that received a requestState string. It throws
      // on tampering or expiry, and the seam answers a frozen -32602 rather
      // than leaking why.
      requestState: { verify: stateCodec.verify },
    },
  );

  /**
   * One round trip: a confirmation before a destructive action.
   *
   * Read it as: "have I been given `confirm` yet? No — ask for it and return.
   * Yes — do the work." The handler is entered twice; only the second entry
   * deploys anything.
   */
  server.registerTool(
    'deploy',
    {
      title: 'Deploy',
      description: 'Deploy to an environment, with confirmation',
      inputSchema: z.object({ env: z.string().describe('Target environment') }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ env }, ctx) => {
      const confirmed = acceptedContent<{ confirm: boolean }>(ctx.mcpReq.inputResponses, 'confirm');

      if (!confirmed) {
        return inputRequired({
          inputRequests: {
            confirm: inputRequired.elicit({
              message: `Deploy to ${env}? This is not reversible.`,
              requestedSchema: {
                type: 'object',
                properties: { confirm: { type: 'boolean', title: 'Go ahead?' } },
                required: ['confirm'],
              },
            }),
          },
        });
      }

      if (!confirmed.confirm) {
        return { content: [{ type: 'text', text: `Cancelled — nothing deployed to ${env}.` }] };
      }

      deployments.push(env);
      return { content: [{ type: 'text', text: `Deployed to ${env}. (${deployments.length} total)` }] };
    },
  );

  /**
   * Two rounds, with server state carried between them.
   *
   * Round 1 asks for the missing address. Round 2 asks the CLIENT's model to
   * write the gift message (`sampling/createMessage` — the same request that
   * used to need a held-open stream). `requestState` is how the server
   * remembers, across a gap it does not control, what it already collected.
   */
  server.registerTool(
    'sendGift',
    {
      title: 'Send a gift',
      description: 'Send a gift — asks for a delivery address, then drafts a card',
      inputSchema: z.object({
        recipient: z.string().describe('Who it is for'),
        occasion: z.string().describe('Birthday, thank-you, …'),
      }),
    },
    async ({ recipient, occasion }, ctx) => {
      // `requestState` is an ACCESSOR, not a value — call it. Because `verify`
      // is configured, what comes back is the decoded, verified payload.
      const carried = ctx.mcpReq.requestState<CarriedState>();

      // Round 1 → ask for the address.
      const address =
        carried?.address ??
        acceptedContent<{ address: string }>(ctx.mcpReq.inputResponses, 'address')?.address;

      if (!address) {
        return inputRequired({
          inputRequests: {
            address: inputRequired.elicit({
              message: `Where should ${recipient}'s gift go?`,
              requestedSchema: {
                type: 'object',
                properties: { address: { type: 'string', title: 'Delivery address' } },
                required: ['address'],
              },
            }),
          },
        });
      }

      // Round 2 → ask the client's model for the card text.
      //
      // `acceptedContent` only surfaces form-mode ELICITATION responses. A
      // sampling result is a different kind, so read it through the general
      // `inputResponse` view — a discriminated union over
      // missing / elicit / sampling / roots.
      const drafted = inputResponse(ctx.mcpReq.inputResponses, 'card');

      if (drafted.kind === 'missing') {
        return inputRequired({
          // Everything learned so far, sealed so it cannot be tampered with in
          // transit through the client.
          requestState: await stateCodec.mint({ address }, ctx),
          inputRequests: {
            card: inputRequired.createMessage({
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Write a short, warm ${occasion} card message for ${recipient}. Two sentences.`,
                  },
                },
              ],
              maxTokens: 120,
            }),
          },
        });
      }

      // A sampling result's `content` is one block, or an array of them on the
      // tool-augmented variant. Normalise before reading.
      const card = drafted.kind === 'sampling' ? textOf(drafted.result.content) : '(no message)';
      return {
        content: [
          { type: 'text', text: `Gift for ${recipient}\nTo: ${address}\nCard: ${card}` },
        ],
      };
    },
  );

  return server;
}

if (isEntrypoint(import.meta.url)) {
  await serveHttp(buildServer, PORT);
  banner('🔁 MRTR MCP server', PORT, [
    'tools     deploy (1 round), sendGift (2 rounds, carries requestState)',
    'note      handlers are re-entered — write them as resumable state machines',
  ]);
}

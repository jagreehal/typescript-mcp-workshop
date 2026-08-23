import { McpServer, completable } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { isEntrypoint } from '../shared/entrypoint';
import { banner, serveHttp } from '../shared/serve';
import { PORT } from './constants';

/**
 * Prompts: parameterised message templates the USER picks, not the model.
 *
 * The distinction that matters — a tool is something the model decides to call;
 * a prompt is something a human chooses from a menu (a slash command, a "/" in
 * the client UI). That is why prompts get argument completion and tools do not.
 */
export function buildServer() {
  const server = new McpServer(
    { name: 'prompts-server', version: '2.0.0' },
    {
      capabilities: { prompts: {}, completions: {} },
      cacheHints: { 'prompts/list': { ttlMs: 60_000, cacheScope: 'public' } },
    },
  );

  server.registerPrompt(
    'greeting',
    {
      title: 'Greeting',
      description: 'Generate a personalised greeting',
      argsSchema: z.object({
        name: z.string().describe("The person's name"),
        // `completable` is why prompts feel like a real UI: the client can ask
        // the server what the valid values are while the user is typing.
        //
        // GOTCHA: `.describe()` must go INSIDE `completable()`. Chaining it
        // afterwards returns a fresh schema without the completable marker,
        // the SDK never registers a `completion/complete` handler, and the
        // call fails with -32601 Method not found. `.optional()` afterwards is
        // fine — the SDK unwraps optionals before checking.
        timeOfDay: completable(z.string().describe('Time of day'), (value) =>
          ['morning', 'afternoon', 'evening'].filter((option) => option.startsWith(value)),
        ).optional(),
      }),
    },
    ({ name, timeOfDay }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `${timeOfDay ? `Good ${timeOfDay}` : 'Hello'}, ${name}! How are you doing today?`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'code_review',
    {
      title: 'Code Review',
      description: 'Build a code review prompt tuned to a language and audience',
      argsSchema: z.object({
        language: completable(z.string().describe('Programming language'), (value) =>
          ['typescript', 'javascript', 'python', 'go', 'rust'].filter((option) =>
            option.startsWith(value.toLowerCase()),
          ),
        ),
        code: z.string().describe('The code to review'),
        focusAreas: z
          .string()
          .describe('Comma-separated: security, performance, readability')
          .optional(),
        experienceLevel: completable(z.string().describe('Who the review is for'), (value) =>
          ['beginner', 'intermediate', 'advanced'].filter((option) => option.startsWith(value)),
        ).optional(),
      }),
    },
    ({ language, code, focusAreas, experienceLevel }) => {
      const focus = focusAreas
        ? `\n\nPay particular attention to: ${focusAreas
            .split(',')
            .map((area) => area.trim())
            .join(', ')}.`
        : '';

      const depth =
        experienceLevel === 'beginner'
          ? '\n\nExplain the reasoning behind each suggestion.'
          : experienceLevel === 'advanced'
            ? '\n\nFocus on architecture and non-obvious failure modes; skip the basics.'
            : '\n\nGive clear, actionable feedback with examples.';

      // MCP prompt messages carry only `user` and `assistant` roles — there is
      // no `system`. Instructions belong in a user message; an `assistant`
      // message means a genuine prior turn you want the model to continue from.
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are an expert ${language} reviewer.${focus}${depth}

Structure the review as: overall assessment, specific issues, what is already good, recommendations.`,
            },
          },
          {
            role: 'user',
            content: { type: 'text', text: `Review this ${language}:\n\n\`\`\`${language}\n${code}\n\`\`\`` },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'team_discussion',
    {
      title: 'Team Discussion',
      description: 'Simulate a multi-perspective team discussion',
      argsSchema: z.object({
        topic: z.string().describe('What to discuss'),
        roles: z.string().describe('Comma-separated roles: developer, designer, pm, qa, security'),
        context: z.string().describe('Constraints or background').optional(),
      }),
    },
    ({ topic, roles, context }) => {
      const described = roles
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean)
        .map((role) => `- ${role.toUpperCase()}: ${ROLE_DESCRIPTIONS[role] ?? 'a team member'}`);

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Simulate a team discussion about "${topic}".

Speak in turn as each of:
${described.join('\n')}
${context ? `\nContext: ${context}` : ''}

Each member gives their own perspective. Keep it constructive and specific.`,
            },
          },
        ],
      };
    },
  );

  return server;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  developer: 'a senior engineer focused on implementation',
  designer: 'a UX designer focused on the user experience',
  pm: 'a product manager focused on user value',
  qa: 'a QA engineer focused on how it breaks',
  architect: 'an architect focused on scale and system boundaries',
  security: 'a security engineer focused on the threat model',
};

if (isEntrypoint(import.meta.url)) {
  await serveHttp(buildServer, PORT);
  banner('📝 Prompts MCP server', PORT, [
    'prompts   greeting, code_review, team_discussion',
    'note      arguments are completable — the client can autocomplete them',
  ]);
}

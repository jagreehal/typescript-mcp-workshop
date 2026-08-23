import type { Client } from '@modelcontextprotocol/client';
import { jsonSchema, tool, type ToolSet } from 'ai';

/**
 * The bridge from an MCP server's tool catalog to AI SDK tools.
 *
 * This is deliberately not hidden in a wrapper library: it is the whole of
 * what "give the model your MCP tools" means. `tools/list` returns JSON Schema,
 * the AI SDK takes JSON Schema, and `execute` is one `tools/call`.
 *
 * `listTools()` is cacheable on 2026-07-28 — the result carries `ttlMs` and
 * `cacheScope` (SEP-2549) and the client honours them, so calling this per
 * conversation does not mean a round trip per conversation.
 */
export async function mcpTools(client: Client): Promise<ToolSet> {
  const { tools } = await client.listTools();

  return Object.fromEntries(
    tools.map((definition) => [
      definition.name,
      tool({
        description: definition.description,
        inputSchema: jsonSchema(definition.inputSchema as Record<string, unknown>),
        execute: async (input) => {
          const result = await client.callTool({
            name: definition.name,
            arguments: input as Record<string, unknown>,
          });
          return renderContent(result.content);
        },
      }),
    ]),
  );
}

/** Merge the catalogs of several servers, prefixing each with its server name. */
export async function mcpToolsFrom(clients: Record<string, Client>): Promise<ToolSet> {
  const sets = await Promise.all(
    Object.entries(clients).map(async ([prefix, client]) => {
      const tools = await mcpTools(client);
      return Object.entries(tools).map(([name, value]) => [`${prefix}_${name}`, value] as const);
    }),
  );
  return Object.fromEntries(sets.flat());
}

type ContentBlock = { type: string; text?: string; uri?: string; mimeType?: string };

/** Tool results are content blocks; a model wants text. */
export function renderContent(content: unknown): string {
  if (!Array.isArray(content)) return String(content ?? '');
  return (content as ContentBlock[])
    .map((block) => {
      if (block.type === 'text') return block.text ?? '';
      if (block.type === 'resource_link') return `[resource ${block.uri}]`;
      return `[${block.type}${block.mimeType ? ` ${block.mimeType}` : ''}]`;
    })
    .join('\n');
}

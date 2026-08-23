import { readdir, readFile, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { isEntrypoint } from '../shared/entrypoint';
import { z } from 'zod';

/**
 * A stdio server: no HTTP, no ports, no auth. The client spawns this process
 * and talks over its stdin/stdout, so the OS process boundary IS the security
 * boundary. This is how local MCP servers (filesystem, git, databases) ship.
 *
 * NOTHING may be written to stdout except protocol frames — a stray
 * `console.log` corrupts the stream. Log to stderr.
 */

// A filesystem server without a root is a file exfiltration tool. The root is
// the whole security model here: one containment check, applied to every path,
// before any I/O happens.
const ROOT = resolve(process.env.MCP_FS_ROOT ?? process.cwd());

function resolveWithinRoot(candidate: string): string {
  const target = resolve(ROOT, candidate);
  const offset = relative(ROOT, target);
  if (offset.startsWith('..') || isAbsolute(offset)) {
    throw new Error(`Path escapes the server root: ${candidate}`);
  }
  return target;
}

export function buildServer() {
  const server = new McpServer(
    { name: 'filesystem', version: '2.0.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'listDirectory',
    {
      title: 'List directory',
      description: 'List the contents of a directory, relative to the server root',
      inputSchema: z.object({ path: z.string().default('.').describe('Directory path') }),
      annotations: { readOnlyHint: true },
    },
    async ({ path }) => {
      try {
        const directory = resolveWithinRoot(path);
        const entries = await readdir(directory, { withFileTypes: true });
        const listing = entries.map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          path: relative(ROOT, join(directory, entry.name)),
        }));
        return { content: [{ type: 'text', text: JSON.stringify(listing, null, 2) }] };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: message(error) }] };
      }
    },
  );

  server.registerTool(
    'readFile',
    {
      title: 'Read file',
      description: 'Read a UTF-8 file, relative to the server root',
      inputSchema: z.object({ path: z.string().describe('File path') }),
      annotations: { readOnlyHint: true },
    },
    async ({ path }) => {
      try {
        const file = resolveWithinRoot(path);
        const info = await stat(file);
        if (info.size > 256 * 1024) {
          return {
            isError: true,
            content: [{ type: 'text', text: `File too large (${info.size} bytes); limit is 256KB.` }],
          };
        }
        return { content: [{ type: 'text', text: await readFile(file, 'utf8') }] };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: message(error) }] };
      }
    },
  );

  return server;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// `serveStdio` is the stdio equivalent of `createMcpHandler`: same factory,
// both eras. A connection that opens with the 2025 `initialize` handshake stays
// pinned to that era for its lifetime.
if (isEntrypoint(import.meta.url)) {
  serveStdio(buildServer, { onerror: (error) => console.error('[mcp]', error.message) });
}

console.error(`📁 filesystem MCP server on stdio — root: ${ROOT}`);

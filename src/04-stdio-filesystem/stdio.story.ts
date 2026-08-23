/**
 * 04 — stdio and the filesystem, as a story that proves itself.
 *
 * The trust boundary here is the process, and the guard that matters is the
 * one stopping a path from escaping the root. That is worth a test rather than
 * a comment: path-traversal bugs are found by attackers, not by readers.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client as McpClient } from '@modelcontextprotocol/client';

const root = mkdtempSync(join(tmpdir(), 'mcp-fs-story-'));
writeFileSync(join(root, 'notes.txt'), 'hello from inside the root');
process.env.MCP_FS_ROOT = root;

// Imported after MCP_FS_ROOT is set: the module resolves its root at load.
const { buildServer } = await import('./server');

describe('04 — stdio and the filesystem', () => {
  let client: McpClient;

  beforeAll(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = buildServer();
    await server.connect(serverTransport);
    client = new Client({ name: 'stdio-story', version: '2.0.0' });
    await client.connect(clientTransport);
  });
  afterAll(async () => {
    await client?.close();
  });

  it('reads a file inside its root', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'The process is the trust boundary',
      markdown: [
        'A stdio server runs as a child process the client spawned, so it has',
        'whatever access that process has. There is no network to firewall — the',
        'only boundary is the one the server draws for itself.',
      ].join('\n'),
    });

    story.given('a server rooted at a temporary directory holding notes.txt');
    story.when('the file is read by relative path');
    const result = await client.callTool({ name: 'readFile', arguments: { path: 'notes.txt' } });

    story.then('the contents come back');
    expect(JSON.stringify(result.content)).toContain('hello from inside the root');
  });

  it('refuses a path that climbs out of the root', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'The guard that matters',
      markdown: [
        '`resolveWithinRoot` resolves the path first and then checks the result',
        'is still under the root. Checking the *input* for `..` instead is the',
        'classic mistake: it misses symlinks, absolute paths and encodings, and',
        'it is exactly the bug this story would catch.',
      ].join('\n'),
    });

    story.given('a server rooted at a temporary directory');

    story.when('a caller asks for ../../etc/passwd');
    const climb = await client.callTool({
      name: 'readFile',
      arguments: { path: '../../etc/passwd' },
    });

    story.then('the read is refused');
    expect(climb.isError).toBe(true);

    story.and('an absolute path outside the root is refused too');
    const absolute = await client.callTool({ name: 'readFile', arguments: { path: '/etc/passwd' } });
    expect(absolute.isError).toBe(true);

    story.table({
      label: 'What the guard rejects',
      columns: ['Path', 'Allowed'],
      rows: [
        ['notes.txt', 'yes'],
        ['../../etc/passwd', 'no'],
        ['/etc/passwd', 'no'],
      ],
    });
  });

  it('lists only what is inside the root', async ({ task }) => {
    story.init(task);
    story.given('a directory listing of the root');
    story.when('it is requested');
    const listed = await client.callTool({ name: 'listDirectory', arguments: { path: '.' } });

    story.then('it names the file that is there');
    expect(JSON.stringify(listed.content)).toContain('notes.txt');
  });
});

import {
  Client,
  StreamableHTTPClientTransport,
  type ClientCapabilities,
} from '@modelcontextprotocol/client';

const CLIENT_INFO = { name: 'typescript-mcp-workshop', version: '2.0.0' };

export type ConnectOptions = {
  /**
   * `'auto'` (the default here) probes the server with `server/discover`, then
   * falls back to the 2025 `initialize` handshake if it doesn't get modern
   * evidence back. `{ pin: '2026-07-28' }` refuses to fall back.
   *
   * The SDK's own default is `'legacy'` — nothing puts a 2026-07-28 byte on
   * the wire unless you ask for it.
   */
  era?: 'auto' | 'legacy' | { pin: '2026-07-28' };
  headers?: Record<string, string>;
  /**
   * What this client declares it can do. On 2026-07-28 these ride the `_meta`
   * envelope of every request rather than a one-off handshake, which is also
   * how a client opts into an extension (module 15).
   */
  capabilities?: ClientCapabilities;
};

/** Connect to an HTTP MCP server and report which era was negotiated. */
export async function connect(url: string, options: ConnectOptions = {}): Promise<Client> {
  const { era = 'auto', headers, capabilities } = options;

  const client = new Client(CLIENT_INFO, { versionNegotiation: { mode: era }, capabilities });

  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: headers ? { headers } : undefined,
  });

  await client.connect(transport);
  console.log(`🔌 connected to ${url} — protocol era: ${client.getProtocolEra()}`);
  return client;
}

/** Retry a connection while a sibling server process is still starting up. */
export async function connectWhenReady(
  url: string,
  options: ConnectOptions & { attempts?: number; delayMs?: number } = {},
): Promise<Client> {
  const { attempts = 20, delayMs = 250, ...connectOptions } = options;

  for (let attempt = 1; ; attempt++) {
    try {
      return await connect(url, connectOptions);
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

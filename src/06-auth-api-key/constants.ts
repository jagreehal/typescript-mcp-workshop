export const PORT = 8085;
export const MCP_URL = `http://localhost:${PORT}/mcp`;

// IMPORTANT: never hardcode API keys in production — environment variables or
// a secrets manager. They are inline here so the example runs with no setup.
export const BOB_API_KEY = 'fk_live_bob_3c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d';
export const ALICE_API_KEY = 'fk_live_alice_4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v';

/** Which identity each key stands for, and what it may do. */
export const API_KEYS: Record<string, { userId: string; name: string; scopes: string[] }> = {
  [BOB_API_KEY]: { userId: 'user_bob', name: 'Bob', scopes: ['read', 'write'] },
  [ALICE_API_KEY]: { userId: 'user_alice', name: 'Alice', scopes: ['read'] },
};

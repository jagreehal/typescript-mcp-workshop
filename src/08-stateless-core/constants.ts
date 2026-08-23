/** Two identical instances behind one load balancer — the point of the module. */
export const INSTANCE_PORTS = [8091, 8092] as const;
export const BALANCER_PORT = 8090;
export const MCP_URL = `http://localhost:${BALANCER_PORT}/mcp`;

/**
 * How long a cart handle stays good. A session used to expire when its
 * connection did; nothing expires this but the store, so the number has to be
 * chosen rather than inherited.
 */
export const CART_TTL_MS = 15 * 60_000;

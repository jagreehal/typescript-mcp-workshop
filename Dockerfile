# One MCP instance in a container. Run as many as you like: 2026-07-28 needs
# no session affinity, so any request may land on any of them (module 08).
#
#   docker build -t mcp-workshop .
#   docker run -p 8087:8087 mcp-workshop
#
# MODULE picks which server runs, and each one has its own port. Publish the
# port that module binds:
#
#   docker run -p 8091:8091 -e MODULE=src/08-stateless-core/server.ts mcp-workshop
FROM node:22-alpine

WORKDIR /app

# Dependencies first, so a code change does not re-install them.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./

# Loopback is the default everywhere else in this workshop, and inside a
# container nothing outside can reach it.
ENV MCP_BIND_HOST=0.0.0.0
ENV MODULE=src/01-tools-only/server.ts

# Not root. A tool handler is somebody else's input reaching your process.
USER node

# Module 01's port, matching the MODULE default above. Change both together.
EXPOSE 8087
CMD ["sh", "-c", "pnpm tsx $MODULE"]

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

const server = new FastMCP({
  name: 'FileSystem',
  version: '1.0.0',
});

server.on('connect', (event) => {
  console.log('Client connected:', JSON.stringify(event.session, null, 2));
});

server.on('disconnect', (event) => {
  console.log('Client disconnected:', JSON.stringify(event.session, null, 2));
});

// Tool: List directory contents
server.addTool({
  name: 'listDirectory',
  description: 'List contents of a directory',
  parameters: z.object({
    path: z.string().describe('Directory path to list'),
  }),
  annotations: {
    readOnlyHint: true,
  },
  execute: async (args): Promise<string> => {
    try {
      const dirPath = path.resolve(args.path);
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      const result = items.map((item) => ({
        name: item.name,
        type: item.isDirectory() ? 'directory' : 'file',
        path: path.join(dirPath, item.name),
      }));

      return JSON.stringify(result, null, 2);
    } catch (error) {
      return `Error listing directory: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

// Tool: Read file contents
server.addTool({
  name: 'readFile',
  description: 'Read contents of a file',
  parameters: z.object({
    path: z.string().describe('File path to read'),
  }),
  annotations: {
    readOnlyHint: true,
  },
  execute: async (args): Promise<string> => {
    try {
      const filePath = path.resolve(args.path);
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      return `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

// Start server with stdio transport
const startServer = async () => {
  try {
    console.log('🚀 Starting File System MCP Server...');
    console.log('   Transport: STDIO');

    await server.start({
      transportType: 'stdio',
    });

    console.log('✅ File System MCP Server started with stdio transport');
    console.log('📡 Ready for stdio communication');
    console.log('🗂️  Features: listDirectory, readFile');
  } catch (error) {
    console.error('❌ Failed to start filesystem server:', error);
    throw error;
  }
};

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await server.stop();
  console.log('✅ Filesystem server shut down successfully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await server.stop();
  console.log('✅ Filesystem server shut down successfully');
  process.exit(0);
});

// Start the server
startServer().catch(console.error);

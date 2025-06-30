import { FastMCP } from 'fastmcp';
import { z } from 'zod';
const PORT = 3008;

// Simple in-memory storage (in production, use Redis or database)
interface CalculationHistory {
  operation: string;
  result: number;
  timestamp: Date;
}

let calculationHistory: CalculationHistory[] = [];
const preferences = {
  decimalPlaces: 2,
  showHistory: true,
};

// Create the FastMCP server
const server = new FastMCP({
  name: 'remote-calculator-server',
  version: '1.0.0',
  instructions: `
This is a remote MCP calculator server that demonstrates:
- HTTP transport handling
- Simple state management
- Proper error handling for remote scenarios
- Production-ready patterns

This server maintains calculation history and user preferences.
  `.trim(),
});

// Add calculation tools
server.addTool({
  name: 'add',
  description: 'Add two numbers together',
  parameters: z.object({
    a: z.coerce.number().describe('The first number to add'),
    b: z.coerce.number().describe('The second number to add'),
  }),
  annotations: {
    openWorldHint: false,
    readOnlyHint: false,
    title: 'Addition Calculator',
  },
  execute: async (args) => {
    const result = args.a + args.b;
    const formattedResult = result.toFixed(preferences.decimalPlaces);

    // Store in history
    calculationHistory.push({
      operation: `${args.a} + ${args.b}`,
      result,
      timestamp: new Date(),
    });

    return `${args.a} + ${args.b} = ${formattedResult}`;
  },
});

server.addTool({
  name: 'multiply',
  description: 'Multiply two numbers together',
  parameters: z.object({
    a: z.coerce.number().describe('The first number to multiply'),
    b: z.coerce.number().describe('The second number to multiply'),
  }),
  annotations: {
    openWorldHint: false,
    readOnlyHint: false,
    title: 'Multiplication Calculator',
  },
  execute: async (args) => {
    const result = args.a * args.b;
    const formattedResult = result.toFixed(preferences.decimalPlaces);

    // Store in history
    calculationHistory.push({
      operation: `${args.a} × ${args.b}`,
      result,
      timestamp: new Date(),
    });

    return `${args.a} × ${args.b} = ${formattedResult}`;
  },
});

server.addTool({
  name: 'getHistory',
  description: 'Get calculation history',
  parameters: z.object({
    limit: z.coerce
      .number()
      .optional()
      .default(10)
      .describe('Maximum number of history items to return'),
  }),
  annotations: {
    openWorldHint: false,
    readOnlyHint: true,
    title: 'Calculation History',
  },
  execute: async (args) => {
    const history = calculationHistory.slice(-args.limit).reverse(); // Most recent first

    if (history.length === 0) {
      return 'No calculations in history yet.';
    }

    const historyText = history
      .map((item, index) => {
        const timeStr = item.timestamp.toLocaleTimeString();
        return `${index + 1}. ${item.operation} = ${item.result.toFixed(preferences.decimalPlaces)} (${timeStr})`;
      })
      .join('\n');

    return `Recent calculations:\n${historyText}`;
  },
});

server.addTool({
  name: 'setPreferences',
  description: 'Set calculation preferences',
  parameters: z.object({
    decimalPlaces: z.coerce
      .number()
      .min(0)
      .max(10)
      .optional()
      .describe('Number of decimal places to show'),
    showHistory: z
      .boolean()
      .optional()
      .describe('Whether to show calculation history'),
  }),
  annotations: {
    openWorldHint: false,
    readOnlyHint: false,
    title: 'Set Preferences',
  },
  execute: async (args) => {
    if (args.decimalPlaces !== undefined) {
      preferences.decimalPlaces = args.decimalPlaces;
    }
    if (args.showHistory !== undefined) {
      preferences.showHistory = args.showHistory;
    }

    return `Preferences updated: ${preferences.decimalPlaces} decimal places, history ${preferences.showHistory ? 'enabled' : 'disabled'}`;
  },
});

server.addTool({
  name: 'clearHistory',
  description: 'Clear calculation history',
  parameters: z.object({}),
  annotations: {
    openWorldHint: false,
    readOnlyHint: false,
    title: 'Clear History',
  },
  execute: async () => {
    const clearedCount = calculationHistory.length;
    calculationHistory = [];
    return `Cleared ${clearedCount} calculation(s) from history`;
  },
});

server.addTool({
  name: 'getServerStats',
  description: 'Get server statistics',
  parameters: z.object({}),
  annotations: {
    openWorldHint: false,
    readOnlyHint: true,
    title: 'Server Statistics',
  },
  execute: async () => {
    const stats = {
      totalCalculations: calculationHistory.length,
      serverUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      preferences,
    };

    return `Server Statistics:
- Total calculations: ${stats.totalCalculations}
- Server uptime: ${Math.round(stats.serverUptime)} seconds
- Memory usage: ${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}MB
- Decimal places: ${stats.preferences.decimalPlaces}
- History enabled: ${stats.preferences.showHistory}`;
  },
});

// Event handlers
server.on('connect', () => {
  console.log('🔗 Client connected to remote server');
  console.log(`   Active connections: 1`);
});

server.on('disconnect', () => {
  console.log('❌ Client disconnected from remote server');
});

// Health check via tool (simplified approach)
server.addTool({
  name: 'healthCheck',
  description: 'Check server health status',
  parameters: z.object({}),
  annotations: {
    openWorldHint: false,
    readOnlyHint: true,
    title: 'Health Check',
  },
  execute: async () => {
    return `Server is healthy! Uptime: ${Math.round(process.uptime())} seconds, Calculations: ${calculationHistory.length}`;
  },
});

// Start the server
const startServer = async () => {
  try {
    console.log(`🚀 Starting Remote MCP Calculator Server...`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Transport: HTTP`);
    console.log(`   Session Management: In-Memory`);

    await server.start({
      transportType: 'httpStream',
      httpStream: {
        port: PORT,
      },
    });

    console.log(`✅ Remote MCP Server running on port ${PORT}`);
    console.log(`📡 MCP Endpoint: http://localhost:${PORT}/mcp`);
    console.log(`🏥 Health Check: Use healthCheck tool`);
    console.log(`🔍 Test with: pnpm inspect:08`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    throw error;
  }
};

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await server.stop();
  console.log('✅ Server shut down successfully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await server.stop();
  console.log('✅ Server shut down successfully');
  process.exit(0);
});

// Start the server
startServer().catch(console.error);

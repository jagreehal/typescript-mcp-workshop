#!/usr/bin/env node

import { FastMCP } from 'fastmcp';
import { SERVER_CONFIG, MIME_TYPES, RESOURCE_NAMES, RESOURCE_URIS } from './constants';

/**
 * Resources Deep-Dive Example Server
 *
 * This focused example demonstrates ONLY MCP resource patterns:
 * - Static file serving and content delivery
 * - Dynamic resource generation
 * - Different MIME types and content formats
 * - Resource URIs and naming conventions
 * - Error handling for resource access
 * - Real-time data resources
 */

const server = new FastMCP({
  name: SERVER_CONFIG.NAME,
  version: SERVER_CONFIG.VERSION,
  instructions: `
This server focuses exclusively on MCP resource patterns.

Learn fundamental resource concepts:
- Static file serving and content delivery
- Dynamic resource generation and caching
- MIME type handling and content formats
- Resource URI schemes and conventions
- Error handling for missing resources
- Real-time and streaming resource data

Master resource management before moving to tools and prompts.
  `.trim(),
});

// Example 1: Simple static text resource
server.addResource({
  uri: RESOURCE_URIS.APP_LOGS,
  name: RESOURCE_NAMES.APP_LOGS,
  mimeType: MIME_TYPES.PLAIN_TEXT,
  description: 'Current application log entries',
  load: async () => {
    // Simulate log content generation
    const timestamp = new Date().toISOString();
    const logEntries = [
      `${timestamp} [INFO] Application started successfully`,
      `${timestamp} [INFO] MCP Resources Deep-Dive server initialized`,
      `${timestamp} [INFO] Resource patterns demonstration active`,
      `${timestamp} [DEBUG] Static resource access: app.log`,
      `${timestamp} [INFO] Ready to serve resource requests`,
    ];

    return {
      text: logEntries.join('\n'),
    };
  },
});

// Example 2: Dynamic JSON resource with current data
server.addResource({
  uri: RESOURCE_URIS.SYSTEM_STATUS,
  name: RESOURCE_NAMES.SYSTEM_STATUS,
  mimeType: MIME_TYPES.JSON,
  description: 'Current system status and metrics',
  load: async () => {
    const status = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      cpu: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      },
      server: {
        name: 'resources-deep-dive-server',
        version: '1.0.0',
        port: 8088,
        activeConnections: 1, // Simplified for demo
      },
      resourceMetrics: {
        totalResources: 8, // Will match actual count
        resourceTypes: ['logs', 'status', 'config', 'documentation', 'images', 'data'],
        lastAccessed: new Date().toISOString(),
      },
    };

    return {
      text: JSON.stringify(status, null, 2),
    };
  },
});

// Example 3: Configuration resource with structured data
server.addResource({
  uri: RESOURCE_URIS.SERVER_CONFIG,
  name: RESOURCE_NAMES.SERVER_CONFIG,
  mimeType: MIME_TYPES.JSON,
  description: 'Current server configuration settings',
  load: async () => {
    const config = {
      server: {
        name: 'resources-deep-dive-server',
        version: '1.0.0',
        transport: 'httpStream',
        port: 8088,
        cors: {
          enabled: true,
          origins: ['*'],
        },
      },
      resources: {
        caching: {
          enabled: false, // Resources are dynamically generated
          ttl: 300, // 5 minutes if enabled
        },
        maxSize: '10MB',
        allowedTypes: [
          'text/plain',
          'text/markdown',
          'application/json',
          'text/html',
          'image/png',
          'text/csv',
        ],
      },
      logging: {
        level: 'info',
        format: 'json',
        destination: 'console',
      },
      features: {
        staticFiles: true,
        dynamicGeneration: true,
        realTimeData: true,
        errorHandling: true,
        mimeTypeDetection: true,
      },
    };

    return {
      text: JSON.stringify(config, null, 2),
    };
  },
});

// Example 4: Markdown documentation resource
server.addResource({
  uri: RESOURCE_URIS.RESOURCES_GUIDE,
  name: RESOURCE_NAMES.RESOURCES_GUIDE,
  mimeType: MIME_TYPES.MARKDOWN,
  description: 'Comprehensive guide to MCP resource patterns',
  load: async () => {
    const guide = `# MCP Resources Deep-Dive Guide

## What Are MCP Resources?

MCP Resources are **read-only data sources** that servers can expose to clients. They represent:
- Files and documents
- Live data feeds
- Configuration information
- Documentation and help content
- Generated content and reports

## Resource URI Schemes

### Common Patterns
- \`file:///path/to/file\` - File system resources
- \`http://example.com/api/data\` - HTTP endpoints
- \`config://settings.json\` - Configuration data
- \`system://status\` - System information
- \`docs://guide.md\` - Documentation
- \`data://dataset.csv\` - Data files

### Custom Schemes
- \`logs://app.log\` - Application logs
- \`metrics://performance\` - Performance data
- \`cache://key\` - Cached content
- \`temp://session-data\` - Temporary resources

## MIME Types and Content

### Text Resources
- \`text/plain\` - Plain text files
- \`text/markdown\` - Markdown documents
- \`text/html\` - HTML content
- \`text/csv\` - CSV data files

### Structured Data
- \`application/json\` - JSON data
- \`application/xml\` - XML documents
- \`application/yaml\` - YAML configuration

### Binary Content
- \`image/png\` - PNG images
- \`image/jpeg\` - JPEG images
- \`application/pdf\` - PDF documents

## Resource Loading Patterns

### Static Content
Resources that return the same content each time:
\`\`\`typescript
load: async () => ({
  text: "Static content here"
})
\`\`\`

### Dynamic Content
Resources that generate content on each request:
\`\`\`typescript
load: async () => ({
  text: \`Current time: \${new Date().toISOString()}\`
})
\`\`\`

### Error Handling
Proper error handling for missing or invalid resources:
\`\`\`typescript
load: async () => {
  try {
    return { text: await loadContent() };
  } catch (error) {
    throw new Error(\`Resource unavailable: \${error.message}\`);
  }
}
\`\`\`

## Best Practices

1. **Use Descriptive URIs**: Make resource identifiers clear and meaningful
2. **Set Correct MIME Types**: Help clients handle content appropriately
3. **Handle Errors Gracefully**: Provide helpful error messages
4. **Consider Performance**: Cache expensive operations when appropriate
5. **Document Resources**: Provide clear names and descriptions
6. **Validate Access**: Ensure resources are available before serving

## Resource vs Tools vs Prompts

- **Resources**: Read-only data sources (this example)
- **Tools**: Interactive functions that modify state or perform actions
- **Prompts**: Template generators for AI model interactions

Each serves a different purpose in the MCP ecosystem.
`;

    return { text: guide };
  },
});

// Example 5: HTML content resource
server.addResource({
  uri: RESOURCE_URIS.RESOURCE_DASHBOARD,
  name: RESOURCE_NAMES.RESOURCE_DASHBOARD,
  mimeType: MIME_TYPES.HTML,
  description: 'HTML dashboard showing resource information',
  load: async () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Resources Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
        .resource-list { margin: 20px 0; }
        .resource-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #007acc; border-radius: 4px; }
        .resource-uri { font-family: monospace; background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
        .mime-type { color: #6c757d; font-size: 0.9em; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-box { background: #e3f2fd; padding: 15px; border-radius: 6px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #1976d2; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗂️ MCP Resources Deep-Dive Dashboard</h1>
            <p>Real-time overview of available resources and their patterns</p>
        </div>

        <div class="stats">
            <div class="stat-box">
                <div class="stat-number">8</div>
                <div>Total Resources</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">6</div>
                <div>MIME Types</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">5</div>
                <div>URI Schemes</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">100%</div>
                <div>Uptime</div>
            </div>
        </div>

        <div class="resource-list">
            <h2>Available Resources</h2>

            <div class="resource-item">
                <h3>Application Logs</h3>
                <div class="resource-uri">file:///logs/app.log</div>
                <div class="mime-type">text/plain</div>
                <p>Current application log entries with timestamps</p>
            </div>

            <div class="resource-item">
                <h3>System Status</h3>
                <div class="resource-uri">system://status</div>
                <div class="mime-type">application/json</div>
                <p>Live system metrics including memory, CPU, and uptime</p>
            </div>

            <div class="resource-item">
                <h3>Server Configuration</h3>
                <div class="resource-uri">config://server.json</div>
                <div class="mime-type">application/json</div>
                <p>Current server configuration and feature settings</p>
            </div>

            <div class="resource-item">
                <h3>Resources Guide</h3>
                <div class="resource-uri">docs://resources-guide.md</div>
                <div class="mime-type">text/markdown</div>
                <p>Comprehensive documentation on MCP resource patterns</p>
            </div>
        </div>

        <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
            <strong>💡 Learning Focus:</strong> This dashboard demonstrates HTML resource serving,
            CSS styling, and dynamic content generation within MCP resources.
            Each resource showcases different patterns and MIME types.
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 0.9em;">
            Generated at: ${new Date().toISOString()}
        </div>
    </div>
</body>
</html>`;

    return { text: html };
  },
});

// Example 6: CSV data resource
server.addResource({
  uri: RESOURCE_URIS.SAMPLE_METRICS,
  name: RESOURCE_NAMES.SAMPLE_METRICS,
  mimeType: MIME_TYPES.CSV,
  description: 'Sample performance metrics in CSV format',
  load: async () => {
    // Generate sample metrics data
    const headers = ['timestamp', 'requests', 'response_time_ms', 'error_rate', 'cpu_usage', 'memory_mb'];
    const rows = [headers.join(',')];

    // Generate 10 sample data points
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(Date.now() - (10 - i) * 60000).toISOString();
      const requests = Math.floor(Math.random() * 1000) + 100;
      const responseTime = Math.floor(Math.random() * 500) + 50;
      const errorRate = (Math.random() * 5).toFixed(2);
      const cpuUsage = (Math.random() * 80 + 10).toFixed(1);
      const memoryMb = Math.floor(Math.random() * 500) + 100;

      rows.push(`${timestamp},${requests},${responseTime},${errorRate},${cpuUsage},${memoryMb}`);
    }

    return {
      text: rows.join('\n'),
    };
  },
});

// Example 7: Base64 image resource
server.addResource({
  uri: RESOURCE_URIS.MCP_LOGO,
  name: RESOURCE_NAMES.MCP_LOGO,
  mimeType: MIME_TYPES.PNG,
  description: 'Model Context Protocol logo image',
  load: async () => {
    // Simple 32x32 placeholder image representing an "MCP" logo
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVFiFtZdNaBNREMefmSRN0lqtWj9QLEVQwYMHL168eFAQD4IHL3rwA71YQdCDBy8ePHhQPHhQPOhBBQ9eFLx48OJBwYMHBQ9eFLx48aBY8QNbP2qTJpud8ZDdJJvsJmk/+EEyz7z3/2femzcvAv+RiAhERERERDRgIXjA4hfm+sT/M7q7u4nrujiOg+u6OI6D67q4rovjODiOg+M4uK6L4zg4joPrujiOg+u6OI6D4zg4joPjOLiui+M4OI6D67q4rovjODiOg+M4uK6L4zg4joPrujiOg+u6uK6L4zg4jkM4HCYcDhMOhwmHw4TDYcLhMOFwmHA4TDgcJhwOEw6HCYfDhMNhwuEw4XCYcDhMOBwmHA4TDocJh8OEw2HC4TDhcJhwOEw4HCYcDhMOhwmHw4TDYcLhMOFwmHA4TDgcJhwOEw6HCYfDhMNhwuEw4XCYcDhMOBwmHA4TDocJh8OEw2HC4TDhcJhwOEw4HCYcDhMOhwmHw4TDYcLhMOFwmHA4TDgcJhwOEw6HCYfDhMNhwuEw4XCYcDhMOBwmHA4TDocJh8OEw2HC4TDhcJhwOEw4HCYcDhMOhwmHw4TDYcLhMOFwmHA4TDgcJhwOEw6HCYfDhMNhwuEw4XCYcDhMOBwmHA4TDocJh8OEw2HC4TDhcJhwOEw4HCYcDhMOhwmHw4TDYcLhMOFwmHA4TDgcJhwOEw6HCYfDhMNhwuEw4XCYcDhMOBwmHA4TDocJh8OEw2HC4TDhcJhwOEw4HCYcDhMOhwmHw4TDYcLhMOFwmHA4TDgcJhwOEw6HCYfDhMNhwuEw4XCYcDhMOBwmHA4TDocJh8OEw2HC4TDhcJhwOEw4HCYcDhMOhwmHw4TDYcLhMOFwmHA4TDgcJhwOEw6HCYfDhMNhwuEw4XCYcDhMOBwmHA4TDocJh8OEw2HC4TDhcJhwOEw4HCYcDhMOhwmHw4TDYcLhMOFwmHA4TDgcJhwOEw6HCYfDhMNhwuEw4XCYcDhMOBwmHA4TDocJh8OEw2HC4TDhcJhwOEw4HCYcDhMOhwmHw4TDYcLhMOFwmHA4TDgcJhwOEw6HCYfDhMNhwuEw4XCYcDhMOBwmHA4TDocJh8OEw2HC4TDhcJhwOEw4HCYcDhMOhwmHw4TDYcLhMOFwmHA4TDgcJhwOEw6HCYfDhMNhwuEw4XCYcDhMOBwmHA4TDocJh8OEw2HC4TDhcJhwOEw4HCYcDhMOhwmHw4TDYcLhMOFwmHA4TDgcJhwOEw6HCYfDhMNhwuEw4XCYcDhMOBwmHA4TDocJh8OEw2HC4TDhcJhwOEw4HCYcDhMOhwmHw4TDYcLhMOFwmHA4/AHQkPF1xUMqnwAAAABJRU5ErkJggg==';

    return {
      text: base64Image,
    };
  },
});

// Example 8: Error handling resource (demonstrates resource that might fail)
server.addResource({
  uri: 'volatile://might-fail',
  name: 'Volatile Resource',
  mimeType: 'text/plain',
  description: 'Resource that demonstrates error handling (fails randomly)',
  load: async () => {
    // Randomly fail to demonstrate error handling
    const shouldFail = Math.random() < 0.3; // 30% chance of failure

    if (shouldFail) {
      throw new Error('Simulated resource failure - resource temporarily unavailable');
    }

    return {
      text: `Success! Resource loaded at ${new Date().toISOString()}\n\nThis resource demonstrates error handling patterns in MCP resources. It randomly fails ~30% of the time to show how clients should handle resource loading errors gracefully.\n\nKey learning points:\n- Resources can fail and should handle errors appropriately\n- Clients should implement retry logic for important resources\n- Error messages should be descriptive and helpful\n- Temporary failures are common in real-world scenarios`,
    };
  },
});

// Event handlers to demonstrate server lifecycle
server.on('connect', (event) => {
  console.log('🗂️  Client connected to resources deep-dive server');
  console.log(`   Session: ${event.session}`);
});

server.on('disconnect', (event) => {
  console.log('❌ Client disconnected from resources deep-dive server');
  console.log(`   Session: ${event.session}`);
});

// Start the server
const port = 8088;

server.start({
  transportType: 'httpStream',
  httpStream: { port },
});

console.log(`🗂️  Resources Deep-Dive MCP Server running on port ${port}`);
console.log(`📡 Connect via: http://localhost:${port}/stream`);
console.log(`🎯 This server focuses exclusively on MCP resource patterns:`);
console.log(`   • Static and dynamic content serving`);
console.log(`   • Multiple MIME types (text, JSON, HTML, CSV, images)`);
console.log(`   • Resource URI schemes and naming conventions`);
console.log(`   • Error handling for resource access`);

#!/usr/bin/env node

import { experimental_createMCPClient as createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';
import { PORT, RESOURCE_URIS, RESOURCE_NAMES } from './constants';

/**
 * Resources Deep-Dive Example Client
 *
 * Demonstrates focused interaction with MCP resources without the distraction
 * of tools and prompts. Perfect for learning core resource concepts.
 */

async function runResourcesDeepDive() {
  console.log('🗂️  Starting MCP Resources Deep-Dive Demo...\n');

  try {
    // Connect to the resources deep-dive server
    // ---
    // NOTE: StreamableHTTPClientTransport enables efficient streaming of large or binary resources (e.g., images, logs, CSV) from the server to the client. This is crucial for scalable, real-world MCP applications where resources may be too large to load all at once or may be streamed in real time.
    // ---
    const mcpClient = await createMCPClient({
      transport: new StreamableHTTPClientTransport(
        new URL(`http://localhost:${PORT}/mcp`),
      ),
    });

    console.log('📡 Connected to resources deep-dive server');

    // Build the list of resources from RESOURCE_URIS and RESOURCE_NAMES
    const resources = Object.entries(RESOURCE_URIS).map(([key, uri]) => ({
      name: (RESOURCE_NAMES as Record<string, string>)[key] || uri,
      uri,
    }));

    console.log(
      `🗂️  Available resources: ${resources.length ? resources.map((r) => r.name || r.uri).join(', ') : 'none'}\n`,
    );

    // --- Explicitly fetch and display each resource ---
    if (resources.length) {
      console.log(
        '🔎 Fetching each resource to demonstrate client-side access:',
      );
      for (const resource of resources) {
        const uri = resource.uri;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (mcpClient as any).fetchResource({ uri });
          // Print a short preview (first 120 chars or base64 length for images)
          let preview = '';
          if (typeof result?.text === 'string') {
            if (uri.startsWith('image://')) {
              preview = `[image/png, base64 length: ${result.text.length}]`;
            } else {
              preview =
                result.text.length > 120
                  ? result.text.slice(0, 120) + '...'
                  : result.text;
            }
          } else {
            preview = '[no text content]';
          }
          console.log(`   • ${resource.name || uri}: ${preview}`);
        } catch (error) {
          console.log(
            `   • ${resource.name || uri}: [Error fetching resource: ${error instanceof Error ? error.message : String(error)}]`,
          );
        }
      }
      console.log('');
    }

    // Demo 1: Understanding Resource Fundamentals
    console.log('🎯 Demo 1: Understanding Resource Fundamentals');
    console.log('='.repeat(50));

    console.log('📚 What Are MCP Resources?');
    console.log(
      '   Resources are READ-ONLY data sources that servers expose to clients.',
    );
    console.log('   Key characteristics:');
    console.log('   • Identified by unique URIs');
    console.log('   • Have specific MIME types for content handling');
    console.log('   • Can be static or dynamically generated');
    console.log(
      '   • Support various content formats (text, JSON, HTML, images, etc.)',
    );
    console.log('   • Enable data sharing without executable code\n');

    // Demo 2: Resource URI Schemes and Patterns
    console.log('🎯 Demo 2: Resource URI Schemes and Patterns');
    console.log('='.repeat(50));

    console.log('🔗 URI Scheme Examples:');
    console.log('   This server demonstrates various URI patterns:');
    console.log('   • file:///logs/app.log - Traditional file system paths');
    console.log('   • system://status - System information and metrics');
    console.log('   • config://server.json - Configuration data');
    console.log('   • docs://resources-guide.md - Documentation resources');
    console.log('   • web://dashboard.html - Web content and dashboards');
    console.log('   • data://sample-metrics.csv - Data files and datasets');
    console.log('   • image://mcp-logo.png - Binary content like images');
    console.log('   • volatile://might-fail - Demonstrating error handling\n');

    console.log('   URI Design Best Practices:');
    console.log('   • Use meaningful schemes that indicate content type');
    console.log(
      '   • Make paths descriptive and hierarchical when appropriate',
    );
    console.log('   • Maintain consistency within your application');
    console.log('   • Consider versioning for evolving resources\n');

    // Demo 3: MIME Types and Content Handling
    console.log('🎯 Demo 3: MIME Types and Content Handling');
    console.log('='.repeat(50));

    console.log('📋 Supported MIME Types in This Server:');
    console.log(
      '   • text/plain - Simple text content (logs, plain text files)',
    );
    console.log(
      '   • application/json - Structured data (status, configuration)',
    );
    console.log('   • text/markdown - Documentation and formatted text');
    console.log('   • text/html - Web content and dashboards');
    console.log('   • text/csv - Tabular data and metrics');
    console.log('   • image/png - Binary image content\n');

    console.log('   MIME Type Importance:');
    console.log('   • Tells clients how to interpret resource content');
    console.log('   • Enables proper rendering and processing');
    console.log('   • Supports content negotiation patterns');
    console.log('   • Essential for binary data handling\n');

    // Demo 4: Static vs Dynamic Resources
    console.log('🎯 Demo 4: Static vs Dynamic Resources');
    console.log('='.repeat(50));

    console.log('📊 Resource Generation Patterns:');
    console.log('   Static Resources:');
    console.log('   • Documentation (docs://resources-guide.md)');
    console.log('   • Configuration templates');
    console.log('   • Image assets and media files');
    console.log('   • Content that rarely changes\n');

    console.log('   Dynamic Resources:');
    console.log('   • System status (system://status) - real-time metrics');
    console.log('   • Log files (file:///logs/app.log) - updated timestamps');
    console.log(
      '   • Data exports (data://sample-metrics.csv) - generated data',
    );
    console.log(
      '   • Dashboards (web://dashboard.html) - current information\n',
    );

    console.log('   Dynamic Generation Benefits:');
    console.log('   • Always current information');
    console.log('   • Reduced storage requirements');
    console.log('   • Customizable based on request context');
    console.log('   • Real-time data integration\n');

    // Demo 5: Error Handling and Reliability
    console.log('🎯 Demo 5: Error Handling and Reliability');
    console.log('='.repeat(50));

    console.log('⚠️  Resource Error Scenarios:');
    console.log('   Resources can fail for various reasons:');
    console.log('   • Network connectivity issues');
    console.log('   • File system access problems');
    console.log('   • Temporary service unavailability');
    console.log('   • Permission or authentication failures');
    console.log('   • Resource generation errors\n');

    console.log('   Error Handling Best Practices:');
    console.log('   • Provide descriptive error messages');
    console.log('   • Implement retry logic for transient failures');
    console.log('   • Use appropriate HTTP status codes');
    console.log('   • Log errors for debugging and monitoring');
    console.log('   • Consider fallback resources when possible\n');

    // Demo 6: Real-World Resource Applications
    console.log('🎯 Demo 6: Real-World Resource Applications');
    console.log('='.repeat(50));

    console.log('🏭 Production Use Cases:');
    console.log('   • API Documentation - Serve OpenAPI specs and guides');
    console.log(
      '   • Configuration Management - Expose settings and feature flags',
    );
    console.log('   • Monitoring Dashboards - Real-time system metrics');
    console.log('   • Data Exports - CSV, JSON data for analysis');
    console.log('   • Asset Serving - Images, documents, media files');
    console.log('   • Log Access - Application and system log files');
    console.log('   • Health Checks - System status and service health\n');

    console.log('   Enterprise Patterns:');
    console.log('   • Content versioning and cache control');
    console.log('   • Access control and authentication');
    console.log('   • Resource discovery and metadata');
    console.log('   • Performance monitoring and optimization');
    console.log('   • Cross-origin resource sharing (CORS)\n');

    // Demo 7: Resource vs Tools vs Prompts
    console.log('🎯 Demo 7: Resource vs Tools vs Prompts');
    console.log('='.repeat(50));

    console.log('🔍 MCP Component Comparison:');
    console.log('   Resources (This Example):');
    console.log('   • READ-ONLY data sources');
    console.log('   • Static or dynamically generated content');
    console.log('   • Various MIME types and formats');
    console.log('   • URI-based identification');
    console.log('   • No side effects or state changes\n');

    console.log('   Tools (see 01a-tools-only):');
    console.log('   • EXECUTABLE functions with parameters');
    console.log('   • Can modify state or perform actions');
    console.log('   • Parameter validation and error handling');
    console.log('   • Support for streaming content delivery');
    console.log('   • Interactive and stateful operations\n');

    console.log('   Prompts (see 01c-prompts-mastery):');
    console.log('   • TEMPLATE generators for AI interactions');
    console.log('   • Parameterized prompt construction');
    console.log('   • Context-aware content generation');
    console.log('   • AI model integration patterns');
    console.log('   • Dynamic prompt customization\n');

    console.log('✨ Resources deep-dive demo overview completed!');
    console.log('\n🎓 Key Resource Concepts Learned:');
    console.log('• Resources are read-only data sources with unique URIs');
    console.log(
      '• MIME types enable proper content handling and interpretation',
    );
    console.log(
      '• Dynamic generation provides real-time and customized content',
    );
    console.log('• Error handling is crucial for reliable resource access');
    console.log('• URI schemes should be meaningful and consistent');
    console.log(
      '• Resources complement tools and prompts in the MCP ecosystem',
    );

    console.log('\n🚀 To interact with these resources:');
    console.log('1. Start the server: npm run example:01b:server');
    console.log('2. Access resources through MCP clients');
    console.log(
      '3. Study the server.ts code to understand implementation patterns',
    );

    console.log('\n🔬 Next Steps in Learning Path:');
    console.log(
      '• Move to 01c-prompts-mastery to learn prompt template patterns',
    );
    console.log(
      '• Return to comprehensive examples (02-07) for combined concepts',
    );
    console.log('• Build custom resource servers for your specific use cases');
  } catch (error) {
    console.error('❌ Demo connection failed:', error);
    console.log('\n💡 Make sure the resources deep-dive server is running:');
    console.log('   npm run example:01b:server');
    console.log(
      '\n📚 This demo showcases resource patterns even without live connection.',
    );
  }
}

// Resource Learning Exercises
function printResourceExercises() {
  console.log('\n📋 Recommended Resource Exercises:');

  console.log('\n1. **URI Design Practice**:');
  console.log('   • Design URIs for different content types in your domain');
  console.log('   • Practice hierarchical resource organization');
  console.log('   • Consider versioning strategies for evolving resources');

  console.log('\n2. **MIME Type Exploration**:');
  console.log('   • Experiment with different content formats');
  console.log('   • Understand how clients handle various MIME types');
  console.log('   • Practice binary data encoding and serving');

  console.log('\n3. **Dynamic Content Generation**:');
  console.log('   • Create resources that reflect current system state');
  console.log('   • Build data export resources with real-time information');
  console.log('   • Implement personalized or context-aware content');

  console.log('\n4. **Error Handling Scenarios**:');
  console.log('   • Test the volatile://might-fail resource multiple times');
  console.log('   • Implement retry logic for failed resource access');
  console.log(
    '   • Practice graceful degradation when resources are unavailable',
  );

  console.log('\n5. **Real-World Implementation**:');
  console.log('   • Create a documentation resource for your application');
  console.log('   • Build a configuration resource with your settings');
  console.log('   • Implement a status dashboard for your services');

  console.log('\n🔍 Understanding Resource Metadata:');
  console.log('• URI: Unique identifier for the resource');
  console.log('• Name: Human-readable display name');
  console.log('• MIME Type: Content format specification');
  console.log('• Description: Purpose and content summary');
  console.log('• Load Function: Dynamic content generation logic');
}

// Run the demo
await runResourcesDeepDive();
printResourceExercises();

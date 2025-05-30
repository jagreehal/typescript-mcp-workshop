# Browser Automation with Playwright MCP: A Comprehensive Guide

## Introduction

Playwright MCP (Model Context Protocol) lets you automate browsers using a community-maintained server, enabling your AI workflows to interact with the real web. This guide will show you how to connect to Playwright MCP, explore its capabilities, and build robust browser automation flows.

**What you'll learn:**

- How to connect to Playwright MCP as a third-party tool provider
- What tools and actions Playwright MCP exposes
- How to perform browser automation: navigation, clicking, form filling, data extraction, screenshots
- How to handle errors and configure browsers
- Security considerations for web automation

---

## Prerequisites

- Node.js (v18 or later)
- pnpm (or npm/yarn)
- TypeScript
- Playwright and @playwright/mcp installed (or available via npx)

---

## 1. Getting Started: Connecting to Playwright MCP

This client launches the Playwright MCP server as a subprocess, connects via stdio, and uses its browser automation tools.

```ts
import {
  experimental_createMCPClient as createMCPClient,
  generateText,
} from 'ai';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import { model } from '../model';

async function main() {
  console.log('🎭 Using Playwright MCP to visit example.com\n');

  try {
    // Create MCP client for Playwright server
    const playwrightClient = await createMCPClient({
      transport: new StdioClientTransport({
        command: 'npx',
        args: ['@playwright/mcp@latest'],
      }),
    });

    console.log('Connected to Playwright MCP server ✓');

    // Get available tools
    const tools = await playwrightClient.tools();
    console.log('=== Available Playwright Tools ===');
    console.dir(tools, { depth: null });

    // ...

    await playwrightClient.close();
    console.log('\nPlaywright MCP client closed ✓');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
```

---

## 2. Exploring Playwright MCP Tools

After connecting, you can list the available tools. Typical tools include:

- `navigate`: Visit a URL
- `click`: Click an element
- `type`: Type into an input
- `extract`: Extract data from the page
- `screenshot`: Take a screenshot
- `select_option`: Select from a dropdown
- `wait_for`: Wait for text or elements

**Example output:**

```json
[
  { "name": "navigate", "description": "Navigate to a URL" },
  { "name": "click", "description": "Click an element" },
  { "name": "type", "description": "Type into an input" },
  { "name": "extract", "description": "Extract data from the page" },
  { "name": "screenshot", "description": "Take a screenshot" }
  // ...more tools
]
```

---

## 3. Step-by-Step: Browser Automation Examples

### a. Navigating to a Page

```ts
const result = await generateText({
  model,
  tools,
  prompt: `Navigate to https://example.com and return the page title.`,
  maxSteps: 10,
});
console.log(result.text);
```

### b. Clicking Elements

```ts
const result = await generateText({
  model,
  tools,
  prompt: `Go to https://news.ycombinator.com, click the first story link, and return the new page's title.`,
  maxSteps: 15,
});
console.log(result.text);
```

### c. Filling Forms

```ts
const result = await generateText({
  model,
  tools,
  prompt: `Go to https://www.google.com, type 'OpenAI' in the search box, and submit the form. Return the titles of the first 5 results.`,
  maxSteps: 20,
});
console.log(result.text);
```

### d. Extracting Data

```ts
const result = await generateText({
  model,
  tools,
  prompt: `Visit https://bbc.co.uk and extract the main headlines as a list.`,
  maxSteps: 15,
});
console.log(result.text);
```

### e. Taking Screenshots

```ts
const result = await generateText({
  model,
  tools,
  prompt: `Go to https://example.com and take a screenshot of the page.`,
  maxSteps: 10,
});
console.log(result.text); // Will include screenshot info or path
```

---

## 4. Error Handling Examples

Browser automation can fail for many reasons. Here's how to handle errors gracefully:

```ts
try {
  const result = await generateText({
    model,
    tools,
    prompt: `Visit a non-existent page and return the title.`,
    maxSteps: 10,
  });
  console.log(result.text);
} catch (error) {
  console.error('Automation failed:', error);
}
```

**Tips:**

- Check for network errors and timeouts
- Validate that elements exist before interacting
- Use try/catch to handle unexpected failures

---

## 5. Browser Configuration

Playwright MCP supports different browsers and modes:

- **Headless vs. Headed:** Headless runs without a UI, headed shows the browser window.
- **Browser types:** Chromium, Firefox, WebKit.

**Example: Setting browser options**

You can pass configuration in your prompt or via tool parameters (see Playwright MCP docs for details):

```ts
const result = await generateText({
  model,
  tools,
  prompt: `Open https://example.com in Firefox, headed mode, and return the page title.`,
  maxSteps: 10,
});
```

**Best Practices:**

- Use headless mode for automation unless debugging
- Limit concurrent sessions to avoid high resource usage

---

## 6. Security Considerations

- **Credential Safety:** Never hardcode or expose sensitive credentials in prompts or code.
- **Sandboxing:** Run browser automation in isolated environments to prevent malicious site access to your system.
- **Data Extraction:** Validate and sanitize any data extracted from the web.
- **Permissions:** Only automate trusted sites when possible.

---

## 7. Troubleshooting

- **Playwright not installed:** Ensure Playwright and its MCP package are available (`npx @playwright/mcp@latest`).
- **Network issues:** The Playwright MCP server needs internet access to visit real web pages.
- **Resource usage:** Browser automation can be resource-intensive—limit concurrent sessions.
- **API changes:** Third-party servers may update their tool schemas—check the latest documentation.
- **Authorization:** If you add authentication, ensure clients provide the correct credentials.
- **Element not found:** Double-check selectors and page structure.

---

## Conclusion

Playwright MCP unlocks powerful browser automation for your AI workflows. With a few lines of code, you can browse, click, extract, and interact with the web—no server code required. Explore the full range of tools, handle errors gracefully, and follow security best practices for robust automation.

> **Build, test, and extend—your AI can now reach out and interact with the real web!**

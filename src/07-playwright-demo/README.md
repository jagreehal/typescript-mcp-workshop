# MCP Demo: Playwright Integration

## Introduction

Imagine an AI assistant that can browse the web, fill in forms, click buttons, and extract information from live websites—all on your behalf. By integrating Playwright, a powerful browser automation library, with the Model Context Protocol (MCP), you can give your AI these superpowers in a safe and controlled way. This demo shows how to expose Playwright's capabilities as MCP tools, enabling AI-driven browser automation for real-world tasks.

## Why Integrate Playwright with MCP?

Web automation opens up a world of possibilities:

- Automatically gather data from websites
- Test web applications end-to-end
- Perform repetitive online tasks (booking, searching, scraping)
- Enable AI to interact with the web as a human would

By wrapping Playwright actions as MCP tools, you ensure that every browser action is explicit, auditable, and under your control.

## How It Works: Step by Step

1. **Playwright Tool Server:** An MCP server is set up with tools that wrap common Playwright actions (e.g., `navigateTo`, `click`, `typeText`, `getInnerText`, `takeScreenshot`).
2. **Browser Instance Management:** The server manages one or more browser instances (Chromium, Firefox, WebKit) in the background.
3. **User Request or AI Plan:** The user asks the AI to perform a web task (e.g., "Check the weather in London on weather.com").
4. **Tool Invocation via MCP:** The AI breaks down the task into a sequence of browser actions and calls the corresponding Playwright tools.
5. **Playwright Execution:** The server translates tool calls into real browser commands, controlling the browser instance.
6. **Results & Feedback:** Results (text, screenshots, success/failure) are returned to the AI, which can use them to continue the task or present the outcome to the user.

## Running the Demo

To try out this demo:

1. Start the server:
   ```sh
   pnpm example:server:07
   ```
2. In a separate terminal, after a few seconds, run the client:
   ```sh
   pnpm example:client:07
   ```

Ensure Playwright browsers are installed:

```sh
npx playwright install
```

When running the demo, try giving the AI a high-level goal (e.g., "Find the price of product X on shopping-site.com"). Watch as it calls a sequence of Playwright tools to navigate, interact, and extract information.

## Key MCP Features Demonstrated

- **Complex Tool Orchestration:** AI managing a sequence of tool calls to achieve a multi-step web task.
- **Interfacing with External Libraries:** MCP tools acting as wrappers around Playwright.
- **Web Automation:** Practical examples of AI performing tasks on live websites.
- **Stateful Interaction:** The browser maintains state (e.g., cookies, current page) across multiple tool calls.

## Best Practices & Security Guidance

- **Robust Selectors:** Use reliable selectors (IDs, data attributes) for web elements to make automation less brittle.
- **Error Handling & Retries:** Web automation can be unpredictable—handle errors gracefully and consider retry logic.
- **Explicit Waits:** Use Playwright's waiting features to ensure elements are ready before interacting.
- **Security (Critical):**
  - Never allow the AI to navigate to arbitrary, untrusted URLs without validation.
  - Be cautious with data extracted from the web—validate and sanitise as needed.
  - If filling forms, restrict what data the AI can submit, especially sensitive information.
  - Run browsers in a sandboxed environment where possible.
- **Resource Management:** Ensure browser instances are closed after use to free up resources.
- **Headless vs. Headful:** Use headless mode for automation, headful for debugging.

## Troubleshooting & Tips

- If automation fails, check browser installation and selector accuracy.
- For complex flows, break tasks into smaller, well-defined tool calls.
- Log all browser actions for auditability and debugging.

## Further Reading

- [Model Context Protocol Documentation](https://modelcontextprotocol.org/)
- [Playwright Documentation](https://playwright.dev/)
- [AI and Web Automation](https://yourcompany.com/blog/ai-web-automation)

---

Integrating Playwright with MCP empowers your AI to interact with the web in powerful new ways. With careful design and robust security, you can automate online tasks, gather data, and test applications—all through the intelligence of your assistant.

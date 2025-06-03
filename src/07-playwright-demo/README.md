# MCP Demo: Playwright Integration

This demo showcases how the Model Context Protocol (MCP) can be integrated with Playwright to enable AI-driven browser automation.

## Overview

Playwright is a powerful Node.js library for automating web browser interactions. By exposing Playwright's capabilities as MCP tools, an AI assistant can be empowered to perform tasks like:

- Navigating to web pages.
- Filling out forms.
- Clicking buttons and interacting with web elements.
- Scraping data from websites.
- Taking screenshots.
- Running end-to-end tests.

This demo illustrates how such an integration might look, allowing an AI to control a web browser through MCP tools.

## How it Works

1.  **Playwright Tool Server:** An MCP server is set up with tools that wrap common Playwright actions.
    - `navigateTo(url: string)`
    - `click(selector: string)`
    - `typeText(selector: string, text: string)`
    - `getInnerText(selector: string) -> string`
    - `takeScreenshot(path: string)`
    - And so on for other Playwright functionalities.
2.  **Browser Instance:** The Playwright tool server manages one or more browser instances (e.g., Chromium, Firefox, WebKit) in the background.
3.  **User Request/AI Plan:** A user might ask the AI to "log in to example.com with username X and password Y and tell me my account balance," or "find the price of product Z on shopping-site.com."
4.  **Tool Invocation via MCP:** The AI assistant, based on the user's request, breaks down the task into a sequence of browser actions and invokes the corresponding Playwright MCP tools.
    - e.g., Call `navigateTo("https://example.com/login")`
    - Then `typeText("#username", "X")`
    - Then `typeText("#password", "Y")`
    - Then `click("#login-button")`
    - Then `getInnerText("#account-balance")`
5.  **Playwright Execution:** The MCP tool server translates these tool calls into actual Playwright commands, which control the browser instance.
6.  **Results & Feedback:** The results of Playwright actions (e.g., text content, success/failure of an action, screenshots) are returned to the AI via MCP. The AI can then use this information to continue the task or present the final result to the user.

## Running the Demo

To run this demo:

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

When running the demo, you might provide a high-level goal to the AI (e.g., "Check the weather on weather.com for London"). Observe how the AI calls a sequence of Playwright tools to open the browser, navigate, interact with elements, and extract the required information.

## Key MCP Features Demonstrated

- **Complex Tool Orchestration:** AI managing a sequence of tool calls to achieve a multi-step task.
- **Interfacing with External Libraries:** MCP tools acting as wrappers around a powerful library like Playwright.
- **Web Automation:** A practical example of AI performing tasks on live websites.
- **Stateful Interaction:** The browser maintains state (e.g., current page, cookies) across multiple tool calls.

## Best Practices & Security

- **Robust Selectors:** Use reliable selectors (e.g., IDs, data-testid attributes) for web elements to make automation less brittle.
- **Error Handling & Retries:** Web automation can be flaky. Implement robust error handling in tools (e.g., element not found, page load errors) and consider retry mechanisms.
- **Explicit Waits:** Use Playwright's auto-waiting capabilities or implement explicit waits for elements to appear or actions to complete before proceeding.
- **Security (Critical):**
  - **Never allow AI to navigate to arbitrary, untrusted URLs provided directly by an end-user without sanitization and validation.** This could lead to the AI interacting with malicious sites.
  - Be cautious about the data the AI extracts from websites and how it's used or presented.
  - If the AI is filling forms, be extremely careful about what data it's allowed to submit, especially PII or credentials.
  - Run browsers in a sandboxed or isolated environment if possible, especially if dealing with untrusted content.
- **Resource Management:** Ensure browser instances are properly closed after use to free up resources.
- **Headless vs. Headful:** Run browsers in headless mode for automation scripts. Use headful mode for debugging.

Integrating Playwright with MCP opens up vast possibilities for AI agents to interact with the web. However, it must be done with a strong emphasis on security, error handling, and robust automation practices.

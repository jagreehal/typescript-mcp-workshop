import { createServer } from 'node:http';
import { connectWhenReady } from '../shared/connect';
import { HOST_PORT, MCP_URL, UI_EXTENSION_ID, UI_MIME_TYPE, VIEW_URI } from './constants';

/**
 * A host, in about a hundred lines, so you can watch the View render.
 *
 * Optional: `pnpm example:15` teaches the protocol without it. What this adds
 * is the third entity. The server is MCP, the View is an iframe, and a host
 * sits between them proxying JSON-RPC in both directions while deciding what
 * it will and will not forward.
 *
 * Node holds the MCP connection; the browser page holds the iframe and talks
 * to Node over two tiny endpoints. That split is not incidental — it is why
 * the page never needs the MCP server's CORS cooperation, and it mirrors how
 * a desktop host is built.
 */

const mcp = await connectWhenReady(MCP_URL, {
  era: { pin: '2026-07-28' },
  capabilities: { extensions: { [UI_EXTENSION_ID]: { mimeTypes: [UI_MIME_TYPE] } } },
});

const template = await mcp.readResource({ uri: VIEW_URI });
const [content] = template.contents;
const viewHtml = content && 'text' in content ? content.text : '';
const csp = (content?._meta as { ui?: { csp?: Record<string, string[]> } } | undefined)?.ui?.csp;

/**
 * The host builds the policy from what the server declared, and from nothing
 * else. An undeclared domain is a blocked domain.
 */
function contentSecurityPolicy(): string {
  const connect = (csp?.connectDomains ?? []).join(' ');
  const resource = (csp?.resourceDomains ?? []).join(' ');
  return [
    `default-src 'none'`,
    `script-src 'unsafe-inline' ${resource}`.trim(),
    `style-src 'unsafe-inline' ${resource}`.trim(),
    `img-src data: ${resource}`.trim(),
    `connect-src ${connect || `'none'`}`,
    `frame-src 'none'`,
    `object-src 'none'`,
  ].join('; ');
}

/** Inject the policy the server asked for before the View ever runs. */
const sandboxedView = viewHtml.replace(
  '<head>',
  `<head>\n    <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy()}" />`,
);

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>Host</title>
<style>
  body { margin: 0; font: 14px/1.5 system-ui, sans-serif; background: #fafafa; color: #18181b; }
  header { padding: 12px 16px; border-bottom: 1px solid #e4e4e7; background: #fff; }
  main { display: grid; grid-template-columns: 1fr 320px; gap: 16px; padding: 16px; align-items: start; }
  iframe { width: 100%; height: 320px; border: 1px solid #e4e4e7; border-radius: 8px; background: #fff; }
  pre { margin: 0; padding: 12px; background: #fff; border: 1px solid #e4e4e7; border-radius: 8px;
        font-size: 12px; max-height: 320px; overflow: auto; }
</style></head>
<body>
  <header><strong>Host</strong> — proxying between the View and the MCP server</header>
  <main>
    <iframe id="view" sandbox="allow-scripts" srcdoc="${sandboxedView.replaceAll('"', '&quot;')}"></iframe>
    <pre id="log"></pre>
  </main>
<script type="module">
  const frame = document.getElementById('view');
  const log = document.getElementById('log');
  const write = (direction, text) => {
    log.textContent += \`\${direction} \${text}\\n\`;
    log.scrollTop = log.scrollHeight;
  };

  const reply = (id, result) => frame.contentWindow.postMessage({ jsonrpc: '2.0', id, result }, '*');
  const push = (method, params) => frame.contentWindow.postMessage({ jsonrpc: '2.0', method, params }, '*');

  window.addEventListener('message', async (event) => {
    // The host checks the source. A View cannot forge another View's frame.
    if (event.source !== frame.contentWindow) return;
    const { id, method, params } = event.data ?? {};
    if (!method) return;
    write('→', method);

    if (method === 'ui/initialize') {
      reply(id, {
        hostInfo: { name: 'workshop-host', version: '1.0.0' },
        capabilities: { tools: {} },
        hostContext: { theme: 'light', displayMode: 'inline', locale: 'en-GB', platform: 'web' },
      });
      return;
    }

    if (method === 'ui/notifications/initialized') {
      // Nothing reaches the View before this. Then, and only then, the host
      // delivers the call that caused it to open.
      const result = await fetch('/call', {
        method: 'POST',
        body: JSON.stringify({ name: 'show_sales', arguments: {} }),
      }).then((response) => response.json());
      write('←', 'ui/notifications/tool-result');
      push('ui/notifications/tool-result', { result });
      return;
    }

    if (method === 'tools/call') {
      // The host decides what it forwards. A real one checks the tool against
      // what this View is allowed to reach, and may ask a human first.
      const result = await fetch('/call', { method: 'POST', body: JSON.stringify(params) })
        .then((response) => response.json());
      reply(id, result);
      return;
    }

    // ui/update-model-context, ui/notifications/size-changed, ui/open-link:
    // host concerns, never forwarded to the server.
    if (id !== undefined) reply(id, {});
  });
</script>
</body></html>`;

const http = createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/call') {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    const parameters = JSON.parse(Buffer.concat(chunks).toString()) as {
      name: string;
      arguments?: Record<string, unknown>;
    };
    console.log(`   → tools/call ${parameters.name}`);
    const result = await mcp.callTool({ name: parameters.name, arguments: parameters.arguments ?? {} });
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(result));
    return;
  }

  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page);
});

http.listen(HOST_PORT, '127.0.0.1', () => {
  console.log(`\n🖥️  Host running — open http://localhost:${HOST_PORT}`);
  console.log(`   csp applied to the View: ${contentSecurityPolicy()}`);
  console.log('   Click "Next quarter" and watch the proxied tools/call arrive here.\n');
});

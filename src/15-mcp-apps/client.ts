import { connectWhenReady } from '../shared/connect';
import { MCP_URL, UI_EXTENSION_ID, UI_MIME_TYPE, VIEW_URI } from './constants';

/**
 * MCP Apps at the protocol level: no browser, no iframe, no bundler.
 *
 * Everything a host does before it renders anything happens here — declare
 * the extension, discover that the server has it, find the tools that carry a
 * View, fetch the template, call the tool. Run `pnpm example:15:host`
 * afterwards to watch a real host take these same bytes and draw them.
 */

type UiToolMeta = { resourceUri?: string; visibility?: ('model' | 'app')[] };

// A host declares the extension the way module 14's client declares tasks:
// through capabilities, which on 2026-07-28 travel in each request's `_meta`
// envelope. There is no `initialize` to declare them once.
const client = await connectWhenReady(MCP_URL, {
  era: { pin: '2026-07-28' },
  capabilities: { extensions: { [UI_EXTENSION_ID]: { mimeTypes: [UI_MIME_TYPE] } } },
});

const serverExtensions = client.getServerCapabilities()?.extensions ?? {};
console.log('\n🤝 Negotiation');
console.log(`   client declares: ${UI_EXTENSION_ID}`);
console.log(`   server advertises: ${Object.keys(serverExtensions).join(', ') || '(none)'}`);
console.log(`   agreed: ${UI_EXTENSION_ID in serverExtensions ? 'render Views' : 'text only'}`);

const { tools } = await client.listTools();
console.log('\n🧰 tools/list');
for (const tool of tools) {
  const ui = (tool._meta as { ui?: UiToolMeta } | undefined)?.ui;
  const visibility = ui?.visibility?.join(' + ') ?? 'model + app (default)';
  console.log(`   ${tool.name.padEnd(14)} view: ${ui?.resourceUri ?? '(none)'}`);
  console.log(`   ${''.padEnd(14)} visible to: ${visibility}`);
}
console.log('\n   refresh_sales is app-only. A host filters it out of the list it');
console.log('   shows the model, so the refresh button costs no prompt tokens.');

// Templates are declared up front precisely so a host can fetch them at
// connect time, hash them, and review them before any tool runs.
const template = await client.readResource({ uri: VIEW_URI });
const [content] = template.contents;
const html = content && 'text' in content ? content.text : '';
const csp = (content?._meta as { ui?: { csp?: Record<string, string[]> } } | undefined)?.ui?.csp;

console.log(`\n🖼️  resources/read ${VIEW_URI}`);
console.log(`   mimeType: ${content?.mimeType}`);
console.log(`   bytes:    ${html.length}`);
console.log(`   csp:      connect=${JSON.stringify(csp?.connectDomains ?? [])} resource=${JSON.stringify(csp?.resourceDomains ?? [])}`);
console.log('   Declaring nothing means the View reaches nothing. That is the default.');

const result = await client.callTool({ name: 'show_sales', arguments: {} });
const text = result.content?.find((block) => block.type === 'text')?.text;

console.log('\n📞 tools/call show_sales');
console.log(`   content (for the model):     ${text}`);
console.log(`   structuredContent (for the View): ${JSON.stringify(result.structuredContent)}`);
console.log('\n   One call, two audiences. Strip the UI away and the model still');
console.log('   gets a usable answer, which is what makes this an enhancement.');

await client.close();

// The same server, called by a host with no UI support at all.
const plain = await connectWhenReady(MCP_URL, { era: { pin: '2026-07-28' } });
const plainResult = await plain.callTool({ name: 'show_sales', arguments: {} });
console.log('\n🔁 Same tool, host without the extension');
console.log(`   ${plainResult.content?.find((block) => block.type === 'text')?.text}`);
console.log('   Nothing failed. Check the server log: it saw no UI capability.\n');
await plain.close();

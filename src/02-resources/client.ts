import { connectWhenReady } from '../shared/connect';
import { MCP_URL, RESOURCE_URIS } from './constants';

const client = await connectWhenReady(MCP_URL);

// `resources/list` walks pagination for you and caches the result according
// to the server's ttlMs / cacheScope.
const { resources } = await client.listResources();
console.log(`\n🗂️  ${resources.length} resources:`);
for (const resource of resources) {
  console.log(`   ${resource.uri.padEnd(34)} ${resource.mimeType ?? ''}  ${resource.name}`);
}

// The call above took the auto-aggregate path: no cursor, so the SDK walks
// every page and hands back the complete list, bounded by `listMaxPages` (64
// by default) so a server whose `nextCursor` never advances cannot spin you
// forever. Against a paginating server that is usually what you want.
//
// The other path takes a cursor and returns one raw page, uncapped:
//
//   const page = await client.listResources({ cursor });
//   // page.resources, page.nextCursor
//
// A cursor is an opaque server-side handle. Do not parse one, do not build
// one — it belongs to the same family as module 08's cart id, and for the
// same reason: with no session there is nowhere else to keep the position.
//
// This server hands back one page, because `McpServer` has no way to
// paginate a registered catalogue. The README says what to do about that.
const firstPage = await client.request({ method: 'resources/list', params: {} });
console.log(
  `\n📄 One raw resources/list: ${firstPage.resources.length} resources, ` +
    `nextCursor=${firstPage.nextCursor ?? '(none — that is how a walk ends)'}`,
);

const { resourceTemplates } = await client.listResourceTemplates();
console.log(`\n🧩 ${resourceTemplates.length} templates:`);
for (const template of resourceTemplates) {
  console.log(`   ${template.uriTemplate.padEnd(34)} ${template.name}`);
}

console.log('\n📖 Reading each resource:\n');

const toRead = [
  ...Object.values(RESOURCE_URIS),
  'data://metrics/platform.csv', // filled in from the template
  'data://metrics/nope.csv', // not a real team — read errors are thrown
];

for (const uri of toRead) {
  try {
    const result = await client.readResource({ uri });
    const [content] = result.contents;
    if (!content) {
      console.log(`   ${uri} → (empty)`);
      continue;
    }

    // The cache fields the server attached to THIS read.
    const ttl = result.ttlMs ?? 0;
    const scope = result.cacheScope ?? 'private';
    const body =
      'blob' in content
        ? `[${content.mimeType}, ${content.blob.length} base64 chars]`
        : preview(content.text);

    console.log(`   ${uri}`);
    console.log(`      cache: ttlMs=${ttl} scope=${scope}`);
    console.log(`      body:  ${body}`);
  } catch (error) {
    console.log(`   ${uri}`);
    console.log(`      error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Read the guide twice. On a 2026-07-28 connection the second read is served
// from the client's cache (ttlMs 3600000) — no round trip.
const first = Date.now();
await client.readResource({ uri: RESOURCE_URIS.RESOURCES_GUIDE });
const uncached = Date.now() - first;
const second = Date.now();
await client.readResource({ uri: RESOURCE_URIS.RESOURCES_GUIDE });
const cached = Date.now() - second;
console.log(`\n⏱️  guide read: ${uncached}ms cold, ${cached}ms warm (era: ${client.getProtocolEra()})`);

await client.close();

function preview(text: string): string {
  const oneLine = text.replaceAll('\n', ' ⏎ ');
  return oneLine.length > 90 ? `${oneLine.slice(0, 90)}…` : oneLine;
}

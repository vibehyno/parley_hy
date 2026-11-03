import { ensureBrowserRuntime } from './browser-runtime.mjs';

// All action implementation belongs to the official MCP. No host code/file transfer tools.
export const excludedBrowserTools = new Set(['browser_run_code_unsafe', 'browser_file_upload', 'browser_drop', 'browser_close']);
export async function connectOfficialBrowser(context, outputDir) {
  await ensureBrowserRuntime();
  const [{ createConnection }, { Client }, { InMemoryTransport }] = await Promise.all([
    import('@playwright/mcp'), import('@modelcontextprotocol/sdk/client/index.js'), import('@modelcontextprotocol/sdk/inMemory.js'),
  ]);
  const server = await createConnection({ browser: { launchOptions: { headless: false } },
    webmcp: false, ...(outputDir ? { outputDir } : {}), timeouts: { action: 10000, navigation: 25000 },
  }, async () => { if (!context) throw new Error('Tool catalog only'); return context; });
  const client = new Client({ name: 'parley-browser', version: '1.4.20' });
  const [local, remote] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(remote); await client.connect(local);
    const tools = (await client.listTools()).tools.filter(tool => !excludedBrowserTools.has(tool.name)).map(tool => {
      const { filename, ...properties } = tool.inputSchema.properties || {};
      return { ...tool, inputSchema: { ...tool.inputSchema, properties } };
    });
    return { tools, call: (name, args) => client.callTool({ name, arguments: args }, undefined, { timeout: 45000 }),
      close: async () => { await client.close(); await server.close(); } };
  } catch (error) { await client.close().catch(() => {}); await server.close().catch(() => {}); throw error; }
}

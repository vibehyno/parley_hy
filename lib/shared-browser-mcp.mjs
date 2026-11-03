#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { connectOfficialBrowser } from './official-browser.mjs';

const catalog = await connectOfficialBrowser(null);
const tools = catalog.tools.map(tool => ({ ...tool,
  description: `${tool.description}\nParley: use the CURRENT turn connection. scope=shared or private. Inspect first; include the returned version for actions.`,
  inputSchema: { ...tool.inputSchema,
    required: [...(tool.inputSchema.required || []), 'connection'],
    properties: { ...tool.inputSchema.properties, connection: { type: 'string', description: 'Current Parley turn connection' },
      scope: { type: 'string', enum: ['shared', 'private'], default: 'shared' },
      version: { type: 'string', description: 'Version returned by the latest snapshot/action' } },
  },
}));
await catalog.close();
const server = new Server({ name: 'parley-playwright', version: '1.4.20' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async request => {
  try {
    if (!tools.some(tool => tool.name === request.params.name)) throw new Error('지원하지 않는 브라우저 도구입니다.');
    const { connection, scope = 'shared', version, ...args } = request.params.arguments || {};
    const match = /^(\d{1,5})\/([A-Za-z0-9_-]{43})$/.exec(connection || '');
    if (!match || +match[1] < 1 || +match[1] > 65535) throw new Error('현재 Parley 호출의 브라우저 연결 정보가 필요합니다.');
    const response = await fetch(`http://127.0.0.1:${match[1]}/api/browser/tool`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${match[2]}` },
      body: JSON.stringify({ name: request.params.name, scope, version, args }), signal: AbortSignal.timeout(60000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '브라우저 호출에 실패했습니다.');
    return result;
  } catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
});
await server.connect(new StdioServerTransport());

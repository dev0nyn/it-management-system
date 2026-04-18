#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from 'http';
import { createMcpServer } from './server.js';
import { validateApiKey } from './auth.js';

const args = process.argv.slice(2);
const transportFlag = args.includes('--transport')
  ? args[args.indexOf('--transport') + 1]
  : 'stdio';

const apiBaseUrl = process.env.MCP_INTERNAL_API_URL ?? 'http://localhost:3000';
const apiSecret = process.env.MCP_INTERNAL_API_SECRET ?? '';

if (!apiSecret) {
  console.error('MCP_INTERNAL_API_SECRET is required');
  process.exit(1);
}

const server = createMcpServer({ apiBaseUrl, apiSecret });

if (transportFlag === 'stdio') {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('CoDev ITMS MCP server running on stdio');
} else if (transportFlag === 'http') {
  const port = parseInt(process.env.MCP_SERVER_PORT ?? '3100', 10);

  const httpServer = createServer(async (req, res) => {
    // API key auth for HTTP transport
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const auth = validateApiKey(apiKey);

    if (!auth && req.url !== '/health') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: invalid or missing API key' }));
      return;
    }

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', transport: 'http' }));
      return;
    }

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  httpServer.listen(port, () => {
    console.error(`CoDev ITMS MCP server running on HTTP port ${port}`);
  });
} else {
  console.error(`Unknown transport: ${transportFlag}. Use 'stdio' or 'http'.`);
  process.exit(1);
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from './client.js';
import { registerTicketTools } from './tools/tickets.js';
import { registerAssetTools } from './tools/assets.js';
import { registerUserTools } from './tools/users.js';
import { registerMonitoringTools } from './tools/monitoring.js';
import { registerReportTools } from './tools/reports.js';

export interface ServerConfig {
  apiBaseUrl: string;
  apiSecret: string;
}

export function createMcpServer(config: ServerConfig): McpServer {
  const server = new McpServer({
    name: 'codev-itms',
    version: '0.1.0',
  });

  const client = new ApiClient(config.apiBaseUrl, config.apiSecret);

  registerTicketTools(server, client);
  registerAssetTools(server, client);
  registerUserTools(server, client);
  registerMonitoringTools(server, client);
  registerReportTools(server, client);

  return server;
}

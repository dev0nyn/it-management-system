import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../client.js';

export function registerMonitoringTools(server: McpServer, client: ApiClient) {
  server.tool(
    'get_monitoring_status',
    'Get current device health summary — lists all monitored devices with their status',
    {},
    async () => {
      const result = await client.get('/api/v1/devices');
      if (!result.ok) return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
    },
  );

  server.tool(
    'get_alerts',
    'List monitoring alerts, optionally filtered by device or status',
    {
      deviceId: z.string().optional().describe('Filter by device UUID'),
      status: z.enum(['open', 'resolved']).optional().describe('Filter by alert status'),
    },
    async (args) => {
      const result = await client.get('/api/v1/alerts', {
        deviceId: args.deviceId,
        status: args.status,
      });
      if (!result.ok) return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
    },
  );
}

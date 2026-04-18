import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../../client.js';
import { registerMonitoringTools } from '../../tools/monitoring.js';

function getToolHandler(server: McpServer, toolName: string) {
  const tools = (server as any)._registeredTools;
  const tool = tools?.[toolName];
  if (!tool) throw new Error(`Tool ${toolName} not registered`);
  return tool.handler;
}

describe('Monitoring tools', () => {
  let server: McpServer;
  let client: ApiClient;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.1' });
    client = new ApiClient('http://localhost:3000', 'test-secret');
    registerMonitoringTools(server, client);
  });

  describe('get_monitoring_status', () => {
    it('returns device health summary', async () => {
      const devices = [
        { id: 'd1', name: 'Web Server', status: 'up' },
        { id: 'd2', name: 'DB Server', status: 'down' },
      ];
      vi.spyOn(client, 'get').mockResolvedValue({ ok: true, status: 200, data: devices });

      const handler = getToolHandler(server, 'get_monitoring_status');
      const result = await handler({}, {} as any);

      expect(result.isError).toBeFalsy();
      expect(JSON.parse(result.content[0].text)).toEqual(devices);
    });
  });

  describe('get_alerts', () => {
    it('returns alerts filtered by status', async () => {
      const alerts = [{ id: 'al1', deviceId: 'd2', resolvedAt: null }];
      vi.spyOn(client, 'get').mockResolvedValue({ ok: true, status: 200, data: alerts });

      const handler = getToolHandler(server, 'get_alerts');
      const result = await handler({ status: 'open' }, {} as any);

      expect(result.isError).toBeFalsy();
      expect(client.get).toHaveBeenCalledWith('/api/v1/alerts', {
        deviceId: undefined,
        status: 'open',
      });
    });
  });
});

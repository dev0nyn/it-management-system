import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../../client.js';
import { registerReportTools } from '../../tools/reports.js';

function getToolHandler(server: McpServer, toolName: string) {
  const tools = (server as any)._registeredTools;
  const tool = tools?.[toolName];
  if (!tool) throw new Error(`Tool ${toolName} not registered`);
  return tool.handler;
}

describe('Report tools', () => {
  let server: McpServer;
  let client: ApiClient;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.1' });
    client = new ApiClient('http://localhost:3000', 'test-secret');
    registerReportTools(server, client);
  });

  describe('run_report', () => {
    it('returns report data', async () => {
      const report = {
        columns: ['status', 'count'],
        rows: [{ status: 'open', count: 5 }, { status: 'closed', count: 12 }],
        generatedAt: '2026-04-17T00:00:00Z',
      };
      vi.spyOn(client, 'get').mockResolvedValue({ ok: true, status: 200, data: report });

      const handler = getToolHandler(server, 'run_report');
      const result = await handler({ reportId: 'tickets-by-status' }, {} as any);

      expect(result.isError).toBeFalsy();
      expect(JSON.parse(result.content[0].text)).toEqual(report);
      expect(client.get).toHaveBeenCalledWith('/api/v1/reports/tickets-by-status', {
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('passes date range when provided', async () => {
      vi.spyOn(client, 'get').mockResolvedValue({ ok: true, status: 200, data: {} });

      const handler = getToolHandler(server, 'run_report');
      await handler({
        reportId: 'assets-by-status',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      }, {} as any);

      expect(client.get).toHaveBeenCalledWith('/api/v1/reports/assets-by-status', {
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      });
    });

    it('returns error on failure', async () => {
      vi.spyOn(client, 'get').mockResolvedValue({ ok: false, status: 404, error: 'Report not found' });

      const handler = getToolHandler(server, 'run_report');
      const result = await handler({ reportId: 'tickets-by-status' }, {} as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Report not found');
    });
  });
});

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../client.js';

export function registerReportTools(server: McpServer, client: ApiClient) {
  server.tool(
    'run_report',
    'Run a report and return JSON results. Available reports: tickets-by-status, tickets-by-resolution-time, assets-by-status, user-activity',
    {
      reportId: z.enum([
        'tickets-by-status',
        'tickets-by-resolution-time',
        'assets-by-status',
        'user-activity',
      ]).describe('Report type to run'),
      startDate: z.string().optional().describe('Start date (ISO 8601, e.g. 2026-01-01)'),
      endDate: z.string().optional().describe('End date (ISO 8601, e.g. 2026-12-31)'),
    },
    async (args) => {
      const result = await client.get(`/api/v1/reports/${args.reportId}`, {
        startDate: args.startDate,
        endDate: args.endDate,
      });
      if (!result.ok) return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
    },
  );
}

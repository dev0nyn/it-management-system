import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../client.js';

export function registerAssetTools(server: McpServer, client: ApiClient) {
  server.tool(
    'list_assets',
    'List assets with optional filters for status and type',
    {
      page: z.number().optional().describe('Page number (default: 1)'),
      status: z.enum(['in_stock', 'assigned', 'repair', 'retired']).optional(),
      search: z.string().optional().describe('Search by name or tag'),
    },
    async (args) => {
      const result = await client.get('/api/v1/assets', {
        page: args.page,
        status: args.status,
        search: args.search,
      });
      if (!result.ok) return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
    },
  );

  server.tool(
    'get_asset',
    'Get a single asset by ID',
    { id: z.string().describe('Asset UUID') },
    async (args) => {
      const result = await client.get(`/api/v1/assets/${args.id}`);
      if (!result.ok) return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
    },
  );

  server.tool(
    'assign_asset',
    'Assign an asset to a user (requires it_staff or admin role)',
    {
      assetId: z.string().describe('Asset UUID'),
      userId: z.string().describe('User UUID to assign to'),
    },
    async (args) => {
      const result = await client.post(`/api/v1/assets/${args.assetId}/assign`, {
        userId: args.userId,
      });
      if (!result.ok) return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
    },
  );
}

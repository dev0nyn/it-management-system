import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../client.js';

export function registerUserTools(server: McpServer, client: ApiClient) {
  server.tool(
    'list_users',
    'List users (requires admin or it_staff role)',
    {
      page: z.number().optional().describe('Page number (default: 1)'),
      search: z.string().optional().describe('Search by name or email'),
    },
    async (args) => {
      const result = await client.get('/api/v1/users', {
        page: args.page,
        search: args.search,
      });
      if (!result.ok) return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
    },
  );
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../client.js';

export function registerTicketTools(server: McpServer, client: ApiClient) {
  server.tool(
    'list_tickets',
    'List tickets with optional filters for status, priority, and assignee',
    {
      page: z.number().optional().describe('Page number (default: 1)'),
      status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      assigneeId: z.string().optional().describe('Filter by assignee user ID'),
    },
    async (args) => {
      const result = await client.get('/api/v1/tickets', {
        page: args.page,
        status: args.status,
        priority: args.priority,
        assigneeId: args.assigneeId,
      });
      if (!result.ok) return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
    },
  );

  server.tool(
    'get_ticket',
    'Get a single ticket by ID',
    { id: z.string().describe('Ticket UUID') },
    async (args) => {
      const result = await client.get(`/api/v1/tickets/${args.id}`);
      if (!result.ok) return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
    },
  );

  server.tool(
    'create_ticket',
    'Create a new support ticket',
    {
      title: z.string().describe('Ticket title'),
      description: z.string().describe('Detailed description'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Default: medium'),
      category: z.string().describe('Category (e.g. hardware, software, network, access)'),
      assetId: z.string().optional().describe('Optional asset UUID to link'),
    },
    async (args) => {
      const result = await client.post('/api/v1/tickets', args);
      if (!result.ok) return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
    },
  );

  server.tool(
    'update_ticket',
    'Update an existing ticket (status, assignee, priority, etc.)',
    {
      id: z.string().describe('Ticket UUID'),
      status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      assigneeId: z.string().optional().describe('Assign to user UUID'),
      title: z.string().optional(),
      description: z.string().optional(),
    },
    async (args) => {
      const { id, ...body } = args;
      const result = await client.patch(`/api/v1/tickets/${id}`, body);
      if (!result.ok) return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
    },
  );
}

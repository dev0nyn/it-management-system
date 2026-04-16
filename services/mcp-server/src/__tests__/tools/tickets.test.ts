import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../../client.js';
import { registerTicketTools } from '../../tools/tickets.js';

// Extract registered tool handlers from the server
function getToolHandler(server: McpServer, toolName: string) {
  // Access internal tool map — McpServer stores tools in a Map
  const tools = (server as any)._registeredTools;
  const tool = tools?.[toolName];
  if (!tool) throw new Error(`Tool ${toolName} not registered`);
  return tool.handler;
}

describe('Ticket tools', () => {
  let server: McpServer;
  let client: ApiClient;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.1' });
    client = new ApiClient('http://localhost:3000', 'test-secret');
    registerTicketTools(server, client);
  });

  describe('list_tickets', () => {
    it('returns tickets on success', async () => {
      const mockData = [{ id: '1', title: 'Test ticket', status: 'open' }];
      vi.spyOn(client, 'get').mockResolvedValue({ ok: true, status: 200, data: mockData });

      const handler = getToolHandler(server, 'list_tickets');
      const result = await handler({ page: 1 }, {} as any);

      expect(result.isError).toBeFalsy();
      expect(JSON.parse(result.content[0].text)).toEqual(mockData);
      expect(client.get).toHaveBeenCalledWith('/api/v1/tickets', {
        page: 1,
        status: undefined,
        priority: undefined,
        assigneeId: undefined,
      });
    });

    it('returns error on API failure', async () => {
      vi.spyOn(client, 'get').mockResolvedValue({ ok: false, status: 500, error: 'Server error' });

      const handler = getToolHandler(server, 'list_tickets');
      const result = await handler({}, {} as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Server error');
    });
  });

  describe('get_ticket', () => {
    it('returns a single ticket', async () => {
      const ticket = { id: 'abc', title: 'Fix printer', status: 'open' };
      vi.spyOn(client, 'get').mockResolvedValue({ ok: true, status: 200, data: ticket });

      const handler = getToolHandler(server, 'get_ticket');
      const result = await handler({ id: 'abc' }, {} as any);

      expect(result.isError).toBeFalsy();
      expect(JSON.parse(result.content[0].text)).toEqual(ticket);
      expect(client.get).toHaveBeenCalledWith('/api/v1/tickets/abc');
    });
  });

  describe('create_ticket', () => {
    it('creates a ticket and returns it', async () => {
      const created = { id: 'new-1', title: 'New ticket', status: 'open' };
      vi.spyOn(client, 'post').mockResolvedValue({ ok: true, status: 201, data: created });

      const handler = getToolHandler(server, 'create_ticket');
      const result = await handler({
        title: 'New ticket',
        description: 'Description',
        category: 'hardware',
      }, {} as any);

      expect(result.isError).toBeFalsy();
      expect(JSON.parse(result.content[0].text)).toEqual(created);
    });

    it('returns error on validation failure', async () => {
      vi.spyOn(client, 'post').mockResolvedValue({
        ok: false, status: 422, error: 'Validation failed',
      });

      const handler = getToolHandler(server, 'create_ticket');
      const result = await handler({
        title: '',
        description: '',
        category: '',
      }, {} as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation failed');
    });
  });

  describe('update_ticket', () => {
    it('updates ticket status', async () => {
      const updated = { id: 'abc', status: 'resolved' };
      vi.spyOn(client, 'patch').mockResolvedValue({ ok: true, status: 200, data: updated });

      const handler = getToolHandler(server, 'update_ticket');
      const result = await handler({ id: 'abc', status: 'resolved' }, {} as any);

      expect(result.isError).toBeFalsy();
      expect(client.patch).toHaveBeenCalledWith('/api/v1/tickets/abc', { status: 'resolved' });
    });
  });
});

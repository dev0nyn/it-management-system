import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../../client.js';
import { registerAssetTools } from '../../tools/assets.js';

function getToolHandler(server: McpServer, toolName: string) {
  const tools = (server as any)._registeredTools;
  const tool = tools?.[toolName];
  if (!tool) throw new Error(`Tool ${toolName} not registered`);
  return tool.handler;
}

describe('Asset tools', () => {
  let server: McpServer;
  let client: ApiClient;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.1' });
    client = new ApiClient('http://localhost:3000', 'test-secret');
    registerAssetTools(server, client);
  });

  describe('list_assets', () => {
    it('returns assets on success', async () => {
      const mockData = [{ id: '1', name: 'Laptop #42', status: 'in_stock' }];
      vi.spyOn(client, 'get').mockResolvedValue({ ok: true, status: 200, data: mockData });

      const handler = getToolHandler(server, 'list_assets');
      const result = await handler({}, {} as any);

      expect(result.isError).toBeFalsy();
      expect(JSON.parse(result.content[0].text)).toEqual(mockData);
    });
  });

  describe('get_asset', () => {
    it('returns a single asset', async () => {
      const asset = { id: 'a1', name: 'Monitor', tag: 'MON-001' };
      vi.spyOn(client, 'get').mockResolvedValue({ ok: true, status: 200, data: asset });

      const handler = getToolHandler(server, 'get_asset');
      const result = await handler({ id: 'a1' }, {} as any);

      expect(result.isError).toBeFalsy();
      expect(JSON.parse(result.content[0].text)).toEqual(asset);
    });

    it('returns error when asset not found', async () => {
      vi.spyOn(client, 'get').mockResolvedValue({ ok: false, status: 404, error: 'Not found' });

      const handler = getToolHandler(server, 'get_asset');
      const result = await handler({ id: 'missing' }, {} as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not found');
    });
  });

  describe('assign_asset', () => {
    it('assigns an asset to a user', async () => {
      const assigned = { id: 'a1', assignedTo: 'u1', status: 'assigned' };
      vi.spyOn(client, 'post').mockResolvedValue({ ok: true, status: 200, data: assigned });

      const handler = getToolHandler(server, 'assign_asset');
      const result = await handler({ assetId: 'a1', userId: 'u1' }, {} as any);

      expect(result.isError).toBeFalsy();
      expect(client.post).toHaveBeenCalledWith('/api/v1/assets/a1/assign', { userId: 'u1' });
    });

    it('returns error when unauthorized', async () => {
      vi.spyOn(client, 'post').mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });

      const handler = getToolHandler(server, 'assign_asset');
      const result = await handler({ assetId: 'a1', userId: 'u1' }, {} as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Forbidden');
    });
  });
});

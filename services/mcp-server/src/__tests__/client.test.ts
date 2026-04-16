import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('http://localhost:3000', 'test-jwt');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends Authorization header on GET', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    await client.get('/api/v1/tickets');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/v1/tickets');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-jwt');
  });

  it('appends query params on GET', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    await client.get('/api/v1/tickets', { page: 2, status: 'open' });

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('page=2');
    expect(url).toContain('status=open');
  });

  it('skips undefined query params', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    await client.get('/api/v1/tickets', { page: 1, status: undefined });

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('page=1');
    expect(url).not.toContain('status');
  });

  it('returns parsed data on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: '1', title: 'Test' } }), { status: 200 }),
    );

    const result = await client.get('/api/v1/tickets/1');
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ id: '1', title: 'Test' });
  });

  it('returns error message on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Not found' } }), { status: 404 }),
    );

    const result = await client.get('/api/v1/tickets/missing');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.error).toBe('Not found');
  });

  it('handles network errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await client.get('/api/v1/tickets');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBe('ECONNREFUSED');
  });

  it('sends JSON body on POST', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'new' } }), { status: 201 }),
    );

    await client.post('/api/v1/tickets', { title: 'New', description: 'Desc', category: 'hw' });

    const [, init] = mockFetch.mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      title: 'New', description: 'Desc', category: 'hw',
    });
  });

  it('handles 204 No Content on DELETE', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    const result = await client.delete('/api/v1/tickets/1');
    expect(result.ok).toBe(true);
    expect(result.status).toBe(204);
  });
});

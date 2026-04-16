/**
 * Internal HTTP client that proxies MCP tool calls to the CoDev ITMS REST API.
 * All tool handlers use this client instead of direct DB access.
 */

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export class ApiClient {
  private baseUrl: string;
  private secret: string;

  constructor(baseUrl: string, secret: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.secret = secret;
  }

  async get<T = unknown>(path: string, params?: Record<string, string | number | undefined>): Promise<ApiResult<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    return this.request<T>(url.toString(), { method: 'GET' });
  }

  async post<T = unknown>(path: string, body: unknown): Promise<ApiResult<T>> {
    return this.request<T>(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async patch<T = unknown>(path: string, body: unknown): Promise<ApiResult<T>> {
    return this.request<T>(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async delete(path: string): Promise<ApiResult> {
    return this.request(`${this.baseUrl}${path}`, { method: 'DELETE' });
  }

  private async request<T>(url: string, init: RequestInit): Promise<ApiResult<T>> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.secret}`);

    try {
      const res = await fetch(url, { ...init, headers });
      if (res.status === 204) return { ok: true, status: 204 };

      const json = await res.json();

      if (!res.ok) {
        const msg = json?.error?.message ?? `HTTP ${res.status}`;
        return { ok: false, status: res.status, error: msg };
      }

      return { ok: true, status: res.status, data: json.data ?? json };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }
}

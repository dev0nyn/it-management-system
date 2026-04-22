/**
 * Jira REST API v3 client.
 * Handles search, create, update, and transition of issues.
 */

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description: string | null;
    status: { name: string };
    priority: { name: string };
    updated: string; // ISO 8601
    assignee?: { accountId: string; displayName: string } | null;
  };
}

export interface JiraCreateResult {
  key: string;
  id: string;
  self: string;
}

export interface JiraClientConfig {
  baseUrl: string;
  userEmail: string;
  apiToken: string;
  projectKey: string;
}

export class JiraClient {
  private baseUrl: string;
  private authHeader: string;
  private projectKey: string;

  constructor(config: JiraClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authHeader = `Basic ${Buffer.from(`${config.userEmail}:${config.apiToken}`).toString('base64')}`;
    this.projectKey = config.projectKey;
  }

  async searchIssues(jql?: string): Promise<JiraIssue[]> {
    const defaultJql = `project = ${this.projectKey} ORDER BY updated DESC`;
    const params = new URLSearchParams({
      jql: jql ?? defaultJql,
      maxResults: '100',
      fields: 'summary,description,status,priority,updated,assignee',
    });

    const res = await this.request(`/rest/api/3/search?${params}`);
    if (!res.ok) throw new Error(`Jira search failed: ${res.status}`);
    const data = await res.json();
    return data.issues as JiraIssue[];
  }

  async createIssue(summary: string, description: string, priority: string): Promise<JiraCreateResult> {
    const body = {
      fields: {
        project: { key: this.projectKey },
        summary,
        description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
        issuetype: { name: 'Task' },
        priority: { name: priority },
      },
    };

    const res = await this.request('/rest/api/3/issue', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jira create failed: ${res.status} ${text}`);
    }

    return res.json() as Promise<JiraCreateResult>;
  }

  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    const res = await this.request(`/rest/api/3/issue/${issueKey}`, {
      method: 'PUT',
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jira update failed: ${res.status} ${text}`);
    }
  }

  async transitionIssue(issueKey: string, transitionName: string): Promise<void> {
    // First get available transitions
    const res = await this.request(`/rest/api/3/issue/${issueKey}/transitions`);
    if (!res.ok) throw new Error(`Failed to get transitions: ${res.status}`);

    const data = await res.json();
    const transition = data.transitions?.find(
      (t: { name: string }) => t.name.toLowerCase() === transitionName.toLowerCase(),
    );

    if (!transition) return; // No matching transition available

    const transRes = await this.request(`/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      body: JSON.stringify({ transition: { id: transition.id } }),
    });

    if (!transRes.ok) {
      const text = await transRes.text();
      throw new Error(`Jira transition failed: ${transRes.status} ${text}`);
    }
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', this.authHeader);
    headers.set('Content-Type', 'application/json');

    return fetch(`${this.baseUrl}${path}`, { ...init, headers });
  }
}

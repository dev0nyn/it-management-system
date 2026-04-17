import { describe, it, expect, vi } from 'vitest';
import { reconcile, type CodevApiClient, type CodevTicket } from '../reconcile.js';
import type { JiraClient, JiraIssue } from '../jira-client.js';

function mockCodevClient(tickets: CodevTicket[]): CodevApiClient {
  return {
    getTickets: vi.fn().mockResolvedValue(tickets),
    createTicket: vi.fn().mockImplementation(async (data) => ({
      id: 'new-codev-id',
      ...data,
      status: 'open',
      assigneeId: null,
      jiraIssueKey: null,
      jiraSyncedAt: null,
      updatedAt: new Date().toISOString(),
    })),
    updateTicket: vi.fn().mockImplementation(async (id, data) => ({
      id,
      ...data,
      updatedAt: new Date().toISOString(),
    })),
  };
}

function mockJiraClient(issues: JiraIssue[]): JiraClient {
  return {
    searchIssues: vi.fn().mockResolvedValue(issues),
    createIssue: vi.fn().mockResolvedValue({ key: 'IT-99', id: '99', self: '' }),
    updateIssue: vi.fn().mockResolvedValue(undefined),
    transitionIssue: vi.fn().mockResolvedValue(undefined),
  } as unknown as JiraClient;
}

const NOW = new Date('2026-04-18T12:00:00Z');
const EARLIER = new Date('2026-04-18T11:00:00Z');
const LATER = new Date('2026-04-18T13:00:00Z');

describe('reconcile', () => {
  it('pushes CoDev→Jira when CoDev is newer', async () => {
    const codevTickets: CodevTicket[] = [{
      id: 'c1', title: 'Fix printer', description: 'Broken', status: 'resolved',
      priority: 'high', category: 'hardware', assigneeId: null,
      jiraIssueKey: 'IT-1', jiraSyncedAt: EARLIER.toISOString(),
      updatedAt: LATER.toISOString(),
    }];

    const jiraIssues: JiraIssue[] = [{
      key: 'IT-1',
      fields: {
        summary: 'Fix printer', description: null,
        status: { name: 'In Progress' }, priority: { name: 'High' },
        updated: NOW.toISOString(),
      },
    }];

    const codev = mockCodevClient(codevTickets);
    const jira = mockJiraClient(jiraIssues);

    const result = await reconcile(codev, jira);

    expect(result.codevToJira).toBe(1);
    expect(result.jiraToCodev).toBe(0);
    expect(jira.updateIssue).toHaveBeenCalledWith('IT-1', expect.objectContaining({ summary: 'Fix printer' }));
  });

  it('pushes Jira→CoDev when Jira is newer', async () => {
    const codevTickets: CodevTicket[] = [{
      id: 'c1', title: 'Fix printer', description: 'Broken', status: 'open',
      priority: 'medium', category: 'hardware', assigneeId: null,
      jiraIssueKey: 'IT-1', jiraSyncedAt: EARLIER.toISOString(),
      updatedAt: EARLIER.toISOString(),
    }];

    const jiraIssues: JiraIssue[] = [{
      key: 'IT-1',
      fields: {
        summary: 'Fix printer UPDATED', description: null,
        status: { name: 'Done' }, priority: { name: 'Highest' },
        updated: LATER.toISOString(),
      },
    }];

    const codev = mockCodevClient(codevTickets);
    const jira = mockJiraClient(jiraIssues);

    const result = await reconcile(codev, jira);

    expect(result.jiraToCodev).toBe(1);
    expect(result.codevToJira).toBe(0);
    expect(codev.updateTicket).toHaveBeenCalledWith('c1', expect.objectContaining({
      title: 'Fix printer UPDATED',
      status: 'closed',
      priority: 'urgent',
    }));
  });

  it('creates CoDev ticket from new Jira issue', async () => {
    const codevTickets: CodevTicket[] = [];
    const jiraIssues: JiraIssue[] = [{
      key: 'IT-50',
      fields: {
        summary: 'New from Jira', description: 'Details here',
        status: { name: 'To Do' }, priority: { name: 'Medium' },
        updated: NOW.toISOString(),
      },
    }];

    const codev = mockCodevClient(codevTickets);
    const jira = mockJiraClient(jiraIssues);

    const result = await reconcile(codev, jira);

    expect(result.newFromJira).toBe(1);
    expect(codev.createTicket).toHaveBeenCalledWith(expect.objectContaining({
      title: 'New from Jira',
      priority: 'medium',
    }));
    expect(codev.updateTicket).toHaveBeenCalledWith('new-codev-id', expect.objectContaining({
      jiraIssueKey: 'IT-50',
      status: 'open',
    }));
  });

  it('does nothing when timestamps are equal', async () => {
    const codevTickets: CodevTicket[] = [{
      id: 'c1', title: 'Same', description: 'Same', status: 'open',
      priority: 'medium', category: 'hardware', assigneeId: null,
      jiraIssueKey: 'IT-1', jiraSyncedAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    }];

    const jiraIssues: JiraIssue[] = [{
      key: 'IT-1',
      fields: {
        summary: 'Same', description: null,
        status: { name: 'To Do' }, priority: { name: 'Medium' },
        updated: NOW.toISOString(),
      },
    }];

    const codev = mockCodevClient(codevTickets);
    const jira = mockJiraClient(jiraIssues);

    const result = await reconcile(codev, jira);

    expect(result.codevToJira).toBe(0);
    expect(result.jiraToCodev).toBe(0);
    expect(result.newFromJira).toBe(0);
  });

  it('handles fetch errors gracefully', async () => {
    const codev: CodevApiClient = {
      getTickets: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      createTicket: vi.fn(),
      updateTicket: vi.fn(),
    };
    const jira = mockJiraClient([]);

    const result = await reconcile(codev, jira);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('ECONNREFUSED');
  });
});

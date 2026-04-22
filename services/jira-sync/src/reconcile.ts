/**
 * Core reconciliation logic: compare CoDev tickets with Jira issues,
 * determine winner via last-writer-wins on updated_at, and sync.
 */

import { JiraClient, type JiraIssue } from './jira-client.js';
import { mapJiraToCodev, mapCodevToJira } from './field-map.js';

export interface CodevTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assigneeId: string | null;
  jiraIssueKey: string | null;
  jiraSyncedAt: string | null;
  updatedAt: string; // ISO 8601
}

export interface CodevApiClient {
  getTickets(): Promise<CodevTicket[]>;
  createTicket(data: { title: string; description: string; priority: string; category: string }): Promise<CodevTicket>;
  updateTicket(id: string, data: Partial<CodevTicket>): Promise<CodevTicket>;
}

export interface ReconcileResult {
  codevToJira: number;
  jiraToCodev: number;
  newFromJira: number;
  newToJira: number;
  errors: string[];
}

export async function reconcile(
  codevClient: CodevApiClient,
  jiraClient: JiraClient,
): Promise<ReconcileResult> {
  const result: ReconcileResult = { codevToJira: 0, jiraToCodev: 0, newFromJira: 0, newToJira: 0, errors: [] };

  let codevTickets: CodevTicket[];
  let jiraIssues: JiraIssue[];

  try {
    [codevTickets, jiraIssues] = await Promise.all([
      codevClient.getTickets(),
      jiraClient.searchIssues(),
    ]);
  } catch (err) {
    result.errors.push(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  // Index CoDev tickets by Jira key
  const codevByJiraKey = new Map<string, CodevTicket>();
  const codevWithoutJira: CodevTicket[] = [];
  for (const t of codevTickets) {
    if (t.jiraIssueKey) codevByJiraKey.set(t.jiraIssueKey, t);
    else codevWithoutJira.push(t);
  }

  // Index Jira issues by key
  const jiraByKey = new Map<string, JiraIssue>();
  for (const issue of jiraIssues) {
    jiraByKey.set(issue.key, issue);
  }

  // 1. Sync existing paired tickets
  for (const [jiraKey, codevTicket] of codevByJiraKey) {
    const jiraIssue = jiraByKey.get(jiraKey);
    if (!jiraIssue) continue; // Jira issue deleted? Skip.

    const codevUpdated = new Date(codevTicket.updatedAt).getTime();
    const jiraUpdated = new Date(jiraIssue.fields.updated).getTime();

    try {
      if (codevUpdated > jiraUpdated) {
        // CoDev wins → push to Jira
        await pushCodevToJira(codevTicket, jiraKey, jiraClient);
        result.codevToJira++;
      } else if (jiraUpdated > codevUpdated) {
        // Jira wins → push to CoDev
        await pushJiraToCodev(jiraIssue, codevTicket.id, codevClient);
        result.jiraToCodev++;
      }
      // Equal timestamps → no action
    } catch (err) {
      result.errors.push(`Sync ${jiraKey}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. New Jira issues (no CoDev pair) → create in CoDev
  for (const [jiraKey, jiraIssue] of jiraByKey) {
    if (codevByJiraKey.has(jiraKey)) continue; // Already paired

    try {
      const priority = mapJiraToCodev('priority', jiraIssue.fields.priority.name) ?? 'medium';
      const status = mapJiraToCodev('status', jiraIssue.fields.status.name) ?? 'open';

      const created = await codevClient.createTicket({
        title: jiraIssue.fields.summary,
        description: jiraIssue.fields.description ?? jiraIssue.fields.summary,
        priority,
        category: 'jira-sync',
      });

      // Link and set status
      await codevClient.updateTicket(created.id, {
        jiraIssueKey: jiraKey,
        jiraSyncedAt: new Date().toISOString(),
        status,
      });

      result.newFromJira++;
    } catch (err) {
      result.errors.push(`New from Jira ${jiraKey}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

async function pushCodevToJira(ticket: CodevTicket, jiraKey: string, jiraClient: JiraClient) {
  const jiraStatus = mapCodevToJira('status', ticket.status);
  const jiraPriority = mapCodevToJira('priority', ticket.priority);

  const fields: Record<string, unknown> = {
    summary: ticket.title,
  };
  if (jiraPriority) fields.priority = { name: jiraPriority };

  await jiraClient.updateIssue(jiraKey, fields);

  if (jiraStatus) {
    await jiraClient.transitionIssue(jiraKey, jiraStatus);
  }
}

async function pushJiraToCodev(issue: JiraIssue, codevId: string, codevClient: CodevApiClient) {
  const codevStatus = mapJiraToCodev('status', issue.fields.status.name);
  const codevPriority = mapJiraToCodev('priority', issue.fields.priority.name);

  await codevClient.updateTicket(codevId, {
    title: issue.fields.summary,
    ...(codevStatus && { status: codevStatus }),
    ...(codevPriority && { priority: codevPriority }),
    jiraSyncedAt: new Date().toISOString(),
  });
}

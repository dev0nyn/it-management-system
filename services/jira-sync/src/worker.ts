/**
 * BullMQ worker that runs the Jira ↔ CoDev reconciliation on a schedule.
 */

import { Queue, Worker } from 'bullmq';
import type IORedis from 'ioredis';
import { JiraClient } from './jira-client.js';
import { reconcile, type CodevApiClient, type CodevTicket } from './reconcile.js';

const QUEUE_NAME = 'jira-sync';
const JOB_NAME = 'reconcile';

export interface WorkerConfig {
  redis: IORedis;
  jiraBaseUrl: string;
  jiraUserEmail: string;
  jiraApiToken: string;
  jiraProjectKey: string;
  codevApiUrl: string;
  codevApiSecret: string;
  syncIntervalSec: number;
}

/** Create a simple CoDev API client that wraps fetch to the REST API */
function createCodevClient(baseUrl: string, secret: string): CodevApiClient {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret}`,
  };

  return {
    async getTickets(): Promise<CodevTicket[]> {
      const res = await fetch(`${baseUrl}/api/v1/tickets?page=1`, { headers });
      if (!res.ok) throw new Error(`CoDev getTickets failed: ${res.status}`);
      const json = await res.json();
      return json.data ?? json;
    },

    async createTicket(data): Promise<CodevTicket> {
      const res = await fetch(`${baseUrl}/api/v1/tickets`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`CoDev createTicket failed: ${res.status}`);
      const json = await res.json();
      return json.data ?? json;
    },

    async updateTicket(id, data): Promise<CodevTicket> {
      const res = await fetch(`${baseUrl}/api/v1/tickets/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`CoDev updateTicket failed: ${res.status}`);
      const json = await res.json();
      return json.data ?? json;
    },
  };
}

export function startSyncWorker(config: WorkerConfig) {
  const connection = config.redis;

  const queue = new Queue(QUEUE_NAME, { connection });

  // Schedule repeatable job
  queue.upsertJobScheduler(
    JOB_NAME,
    { every: config.syncIntervalSec * 1000 },
    { name: JOB_NAME },
  );

  const jiraClient = new JiraClient({
    baseUrl: config.jiraBaseUrl,
    userEmail: config.jiraUserEmail,
    apiToken: config.jiraApiToken,
    projectKey: config.jiraProjectKey,
  });

  const codevClient = createCodevClient(config.codevApiUrl, config.codevApiSecret);

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      console.log(`[jira-sync] Starting reconciliation...`);
      const result = await reconcile(codevClient, jiraClient);
      console.log(
        `[jira-sync] Done: ${result.codevToJira} CoDev→Jira, ${result.jiraToCodev} Jira→CoDev, ` +
        `${result.newFromJira} new from Jira, ${result.errors.length} errors`,
      );
      if (result.errors.length > 0) {
        console.error(`[jira-sync] Errors:`, result.errors);
      }
      return result;
    },
    {
      connection,
      concurrency: 1, // Only one reconciliation at a time
    },
  );

  worker.on('failed', (job, err) => {
    console.error(`[jira-sync] Job ${job?.id} failed:`, err.message);
  });

  return { queue, worker };
}

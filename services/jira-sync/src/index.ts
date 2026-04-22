#!/usr/bin/env node

import IORedis from 'ioredis';
import { startSyncWorker } from './worker.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const jiraBaseUrl = process.env.JIRA_BASE_URL;
const jiraUserEmail = process.env.JIRA_USER_EMAIL;
const jiraApiToken = process.env.JIRA_API_TOKEN;
const jiraProjectKey = process.env.JIRA_PROJECT_KEY;
const codevApiUrl = process.env.MCP_INTERNAL_API_URL ?? 'http://localhost:3000';
const codevApiSecret = process.env.MCP_INTERNAL_API_SECRET ?? '';
const syncIntervalSec = parseInt(process.env.JIRA_SYNC_INTERVAL_SEC ?? '30', 10);

if (!jiraBaseUrl || !jiraUserEmail || !jiraApiToken || !jiraProjectKey) {
  console.error('Missing required Jira env vars: JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY');
  process.exit(1);
}

if (!codevApiSecret) {
  console.error('MCP_INTERNAL_API_SECRET is required for CoDev API access');
  process.exit(1);
}

const redis = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const { worker } = startSyncWorker({
  redis,
  jiraBaseUrl,
  jiraUserEmail,
  jiraApiToken,
  jiraProjectKey,
  codevApiUrl,
  codevApiSecret,
  syncIntervalSec,
});

console.log(`[jira-sync] Worker started. Sync interval: ${syncIntervalSec}s`);

process.on('SIGTERM', async () => {
  console.log('[jira-sync] Shutting down...');
  await worker.close();
  await redis.quit();
  process.exit(0);
});

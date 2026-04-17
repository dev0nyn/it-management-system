ALTER TABLE "tickets" ADD COLUMN "jira_issue_key" text UNIQUE;
ALTER TABLE "tickets" ADD COLUMN "jira_synced_at" timestamp;

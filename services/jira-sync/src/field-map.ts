import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface FieldMap {
  status: { jira_to_codev: Record<string, string>; codev_to_jira: Record<string, string> };
  priority: { jira_to_codev: Record<string, string>; codev_to_jira: Record<string, string> };
}

let cached: FieldMap | null = null;

export function loadFieldMap(configPath?: string): FieldMap {
  if (cached) return cached;

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const path = configPath ?? resolve(__dirname, '..', 'config', 'field-map.yaml');
  const raw = readFileSync(path, 'utf-8');
  cached = parse(raw) as FieldMap;
  return cached;
}

export function mapJiraToCodev(field: 'status' | 'priority', jiraValue: string): string | undefined {
  const map = loadFieldMap();
  return map[field].jira_to_codev[jiraValue];
}

export function mapCodevToJira(field: 'status' | 'priority', codevValue: string): string | undefined {
  const map = loadFieldMap();
  return map[field].codev_to_jira[codevValue];
}

/** Reset cache (for testing) */
export function resetFieldMapCache() {
  cached = null;
}

import { describe, it, expect, afterEach } from 'vitest';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mapJiraToCodev, mapCodevToJira, resetFieldMapCache } from '../field-map.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

afterEach(() => resetFieldMapCache());

describe('field-map', () => {
  describe('mapJiraToCodev', () => {
    it('maps Jira status "To Do" to CoDev "open"', () => {
      expect(mapJiraToCodev('status', 'To Do')).toBe('open');
    });

    it('maps Jira status "In Progress" to CoDev "in_progress"', () => {
      expect(mapJiraToCodev('status', 'In Progress')).toBe('in_progress');
    });

    it('maps Jira status "Done" to CoDev "closed"', () => {
      expect(mapJiraToCodev('status', 'Done')).toBe('closed');
    });

    it('maps Jira priority "Highest" to CoDev "urgent"', () => {
      expect(mapJiraToCodev('priority', 'Highest')).toBe('urgent');
    });

    it('maps Jira priority "High" to CoDev "high"', () => {
      expect(mapJiraToCodev('priority', 'High')).toBe('high');
    });

    it('returns undefined for unknown Jira value', () => {
      expect(mapJiraToCodev('status', 'Unknown Status')).toBeUndefined();
    });
  });

  describe('mapCodevToJira', () => {
    it('maps CoDev status "open" to Jira "To Do"', () => {
      expect(mapCodevToJira('status', 'open')).toBe('To Do');
    });

    it('maps CoDev status "resolved" to Jira "Done"', () => {
      expect(mapCodevToJira('status', 'resolved')).toBe('Done');
    });

    it('maps CoDev priority "urgent" to Jira "Highest"', () => {
      expect(mapCodevToJira('priority', 'urgent')).toBe('Highest');
    });

    it('returns undefined for unknown CoDev value', () => {
      expect(mapCodevToJira('priority', 'unknown')).toBeUndefined();
    });
  });
});

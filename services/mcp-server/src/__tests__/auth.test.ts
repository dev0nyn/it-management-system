import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateApiKey, hasRole } from '../auth.js';

describe('auth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateApiKey', () => {
    it('returns null when MCP_API_KEY is not configured', () => {
      delete process.env.MCP_API_KEY;
      expect(validateApiKey('some-key')).toBeNull();
    });

    it('returns null when no key is provided', () => {
      process.env.MCP_API_KEY = 'valid-key';
      expect(validateApiKey(undefined)).toBeNull();
    });

    it('returns null when key does not match', () => {
      process.env.MCP_API_KEY = 'valid-key';
      expect(validateApiKey('wrong-key')).toBeNull();
    });

    it('returns auth context with default admin role', () => {
      process.env.MCP_API_KEY = 'valid-key';
      const auth = validateApiKey('valid-key');
      expect(auth).toEqual({ apiKey: 'valid-key', role: 'admin' });
    });

    it('uses MCP_API_KEY_ROLE when set', () => {
      process.env.MCP_API_KEY = 'valid-key';
      process.env.MCP_API_KEY_ROLE = 'it_staff';
      const auth = validateApiKey('valid-key');
      expect(auth).toEqual({ apiKey: 'valid-key', role: 'it_staff' });
    });
  });

  describe('hasRole', () => {
    it('admin has all roles', () => {
      const admin = { apiKey: 'k', role: 'admin' as const };
      expect(hasRole(admin, 'admin')).toBe(true);
      expect(hasRole(admin, 'it_staff')).toBe(true);
      expect(hasRole(admin, 'end_user')).toBe(true);
    });

    it('it_staff has it_staff and end_user but not admin', () => {
      const staff = { apiKey: 'k', role: 'it_staff' as const };
      expect(hasRole(staff, 'admin')).toBe(false);
      expect(hasRole(staff, 'it_staff')).toBe(true);
      expect(hasRole(staff, 'end_user')).toBe(true);
    });

    it('end_user only has end_user', () => {
      const user = { apiKey: 'k', role: 'end_user' as const };
      expect(hasRole(user, 'admin')).toBe(false);
      expect(hasRole(user, 'it_staff')).toBe(false);
      expect(hasRole(user, 'end_user')).toBe(true);
    });
  });
});

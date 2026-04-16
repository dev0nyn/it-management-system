/**
 * API key authentication for the MCP server.
 *
 * V1 uses a single pre-configured API key (MCP_API_KEY env var).
 * The key is associated with a role via MCP_API_KEY_ROLE (default: admin).
 * Multi-key management is deferred to Story 8.9.
 */

export type Role = 'admin' | 'it_staff' | 'end_user';

export interface AuthContext {
  apiKey: string;
  role: Role;
}

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  it_staff: 2,
  end_user: 1,
};

export function validateApiKey(key: string | undefined): AuthContext | null {
  const configuredKey = process.env.MCP_API_KEY;
  if (!configuredKey || !key || key !== configuredKey) return null;

  const role = (process.env.MCP_API_KEY_ROLE ?? 'admin') as Role;
  if (!ROLE_HIERARCHY[role]) return null;

  return { apiKey: key, role };
}

export function hasRole(auth: AuthContext, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[auth.role] >= ROLE_HIERARCHY[requiredRole];
}

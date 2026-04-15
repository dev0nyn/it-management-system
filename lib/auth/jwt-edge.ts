import { jwtVerify } from "jose";
import { JWT_ALGORITHM, type TokenPayload } from "./jwt";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Edge-compatible JWT verification using `jose`.
 * Use this in middleware (Edge runtime). For server-side Node.js code, use lib/auth/jwt.ts.
 * Uses JWT_ALGORITHM from jwt.ts to keep both implementations in sync.
 */
export async function verifyTokenEdge(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: [JWT_ALGORITHM] });
  return payload as unknown as TokenPayload;
}

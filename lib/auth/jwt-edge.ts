import { jwtVerify } from "jose";
import type { TokenPayload } from "./jwt";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Edge-compatible JWT verification using `jose`.
 * Use this in middleware (Edge runtime). For server-side Node.js code, use lib/auth/jwt.ts.
 */
export async function verifyTokenEdge(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as TokenPayload;
}

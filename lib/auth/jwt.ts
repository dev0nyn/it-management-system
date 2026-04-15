import jwt from "jsonwebtoken";

export interface TokenPayload {
  id: string;
  email: string;
  role: "admin" | "it_staff" | "end_user";
}

const secret = process.env.JWT_ACCESS_SECRET!;

export function signToken(payload: TokenPayload): string {
  const ttl = (process.env.JWT_ACCESS_TTL ?? "15m") as `${number}${"s" | "m" | "h" | "d"}`;
  return jwt.sign(payload, secret, { expiresIn: ttl });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload;
}

import jwt from "jsonwebtoken";

export interface TokenPayload {
  id: string;
  email: string;
  role: "admin" | "it_staff" | "end_user";
}

const secret = process.env.JWT_SECRET!;

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload;
}

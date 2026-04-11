import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { findByEmail } from "@/lib/users/repository";
import { signToken } from "@/lib/auth/jwt";

// --- Zod schema ---
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// --- In-memory rate limiter: max 5 attempts per IP per 60s ---
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const attempts = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const prev = (attempts.get(ip) ?? []).filter((t) => t > windowStart);
  if (prev.length >= RATE_LIMIT_MAX) {
    return true;
  }
  attempts.set(ip, [...prev, now]);
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  // Rate limiting — check before parsing body
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many attempts. Please try again later." } },
      { status: 429 }
    );
  }

  // Zod validation
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 422 }
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 }
    );
  }

  const { email, password } = parsed.data;

  const user = await findByEmail(email);

  if (!user || user.deletedAt) {
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
      { status: 401 }
    );
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
      { status: 401 }
    );
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

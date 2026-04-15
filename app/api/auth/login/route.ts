import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { findByEmail } from "@/lib/users/repository";
import { signToken } from "@/lib/auth/jwt";
import { isRateLimited, recordFailedAttempt } from "@/lib/rate-limit";

// --- Zod schema ---
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Extract the client IP from the request.
 * Uses the rightmost value in x-forwarded-for (trusted proxy pattern)
 * to prevent spoofing via client-controlled headers.
 */
function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim());
    return parts[parts.length - 1] || "unknown";
  }
  return "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // Rate limiting — check before parsing body (IP-only check, email not yet available)
  if (await isRateLimited(ip)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many attempts. Please try again later." } },
      { status: 429, headers: { "Retry-After": "60" } }
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

  // Check per-email rate limit
  if (await isRateLimited(ip, email)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many attempts. Please try again later." } },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const user = await findByEmail(email);

  if (!user || user.deletedAt) {
    await recordFailedAttempt(ip, email);
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
      { status: 401 }
    );
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    await recordFailedAttempt(ip, email);
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

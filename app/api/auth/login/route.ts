export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { findByEmail } from "@/lib/users/repository";
import { signToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

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

  return NextResponse.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

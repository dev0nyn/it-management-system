export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import * as service from "@/lib/users/service";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "it_staff", "end_user"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    const user = await service.getUser(id);
    return NextResponse.json({ data: user });
  } catch (err) {
    if (err instanceof service.UserNotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }
    throw err;
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  try {
    const user = await service.updateUser(id, parsed.data);
    return NextResponse.json({ data: user });
  } catch (err) {
    if (err instanceof service.UserNotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }
    if (err instanceof service.EmailConflictError) {
      return NextResponse.json(
        { error: { code: "EMAIL_CONFLICT", message: "Email already in use" } },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    await service.deleteUser(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof service.UserNotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }
    throw err;
  }
}

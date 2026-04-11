import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import * as service from "@/lib/users/service";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "it_staff", "end_user"]),
});

export async function GET(req: NextRequest) {
  const auth = requireRole(req, "admin");
  if ("error" in auth) return auth.error;

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const search = searchParams.get("search") ?? undefined;

  const users = await service.listUsers(page, search);
  return NextResponse.json({ data: users, page });
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "admin");
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  try {
    const user = await service.createUser(parsed.data);
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (err) {
    if (err instanceof service.EmailConflictError) {
      return NextResponse.json(
        { error: { code: "EMAIL_CONFLICT", message: "Email already in use" } },
        { status: 409 }
      );
    }
    throw err;
  }
}

export const runtime = "nodejs";

/**
 * User search endpoint for the asset assign dialog.
 * Accessible to admin + it_staff.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { ilike, isNull, and, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = requireAnyRole(req, ["admin", "it_staff"]);
  if ("error" in auth) return auth.error;

  const search = req.nextUrl.searchParams.get("search") ?? "";

  const conditions = [isNull(users.deletedAt)];
  if (search) {
    conditions.push(
      or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!
    );
  }

  const results = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(and(...conditions))
    .limit(20);

  return NextResponse.json({ data: results });
}

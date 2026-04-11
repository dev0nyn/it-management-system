import argon2 from "argon2";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";

async function seed() {
  const email = "admin@example.com";

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    console.log("Seed: admin user already exists, skipping.");
    process.exit(0);
  }

  const passwordHash = await argon2.hash("Admin1234!");

  await db.insert(users).values({
    email,
    name: "Admin User",
    role: "admin",
    passwordHash,
  });

  console.log("Seed: created admin@example.com with role=admin");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

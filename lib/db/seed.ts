import argon2 from "argon2";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { users } from "@/lib/db/schema/users";

async function seed() {
  if (process.env.NODE_ENV === "production" && !process.env.SEED_ADMIN_PASSWORD) {
    console.error(
      "Seed: refusing to run in production without SEED_ADMIN_PASSWORD set. " +
        "Set SEED_ADMIN_PASSWORD to a strong password before seeding."
    );
    process.exit(1);
  }

  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  try {
    const email = "admin@example.com";
    const plainPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";
    const passwordHash = await argon2.hash(plainPassword);

    const [inserted] = await db
      .insert(users)
      .values({
        email,
        name: "Admin User",
        role: "admin",
        passwordHash,
      })
      .onConflictDoNothing()
      .returning({ id: users.id });

    if (inserted) {
      console.log(`Seed: created admin@example.com (id=${inserted.id})`);
    } else {
      console.log("Seed: admin user already exists, skipping.");
    }
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

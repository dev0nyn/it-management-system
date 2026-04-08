import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import * as argon2 from 'argon2'
import 'dotenv/config'

const connectionString =
  process.env.DATABASE_URL || 'postgres://it_admin:password@127.0.0.1:54321/it_management'
const sql = postgres(connectionString, { max: 1 })
const db = drizzle(sql, { schema })

async function main() {
  console.log('Seeding database...')
  const passwordHash = await argon2.hash('admin123')

  await db
    .insert(schema.users)
    .values({
      email: 'admin@example.com',
      passwordHash,
      role: 'admin',
      isActive: true,
    })
    .onConflictDoNothing()

  console.log('Database seeded with admin user: admin@example.com / admin123')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})

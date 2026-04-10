import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import 'dotenv/config'

const connectionString =
  process.env.DATABASE_URL || 'postgres://it_admin:password@127.0.0.1:54321/it_management'
const sql = postgres(connectionString, { max: 1 })
const db = drizzle(sql)

async function main() {
  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: './migrations' })
  console.log('Migrations complete!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})

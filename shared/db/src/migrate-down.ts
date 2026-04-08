import postgres from 'postgres'
import 'dotenv/config'

const connectionString =
  process.env.DATABASE_URL || 'postgres://it_admin:password@127.0.0.1:54321/it_management'
const sql = postgres(connectionString, { max: 1 })

async function main() {
  console.log('Dropping schema for migrate-down...')
  await sql.unsafe('DROP SCHEMA public CASCADE;')
  await sql.unsafe('CREATE SCHEMA public;')
  await sql.unsafe('GRANT ALL ON SCHEMA public TO public;')
  console.log('Schema dropped!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Drop failed:', err)
  process.exit(1)
})

import type { Config } from 'drizzle-kit'

export default {
  schema: './src/schema.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString:
      process.env.DATABASE_URL || 'postgres://it_admin:password@127.0.0.1:54321/it_management',
  },
} satisfies Config

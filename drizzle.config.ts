import type { Config } from 'drizzle-kit'

export default {
  schema: './services/api/src/db/schema/index.ts',
  out: './services/api/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config

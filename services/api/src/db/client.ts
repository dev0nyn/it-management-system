import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { validateEnv } from '../env.js'

const env = validateEnv()

const queryClient = postgres(env.DATABASE_URL)
export const db = drizzle(queryClient)

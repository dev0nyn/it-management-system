# IT Management System

## 🚀 Tech Stack

- **Frontend**: Next.js 14 App Router
- **Backend**: Fastify
- **Database**: PostgreSQL 16
- **Monorepo**: pnpm workspaces

## Local Development Setup

**Prerequisites:** [pnpm](https://pnpm.io), [Docker](https://docker.com), [Supabase CLI](https://supabase.com/docs/guides/local-development)

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Start local Supabase** (first time: run `supabase init` in repo root)

   ```bash
   supabase start
   supabase status  # copy the API URL and anon key
   ```

3. **Configure environment**

   ```bash
   cp services/api/.env.example services/api/.env
   cp apps/web/.env.example apps/web/.env.local
   # Edit both files and fill in values from `supabase status`
   ```

4. **Start the apps**
   ```bash
   pnpm dev
   ```

| Service         | URL                    |
| --------------- | ---------------------- |
| Frontend        | http://localhost:3000  |
| API             | http://localhost:3001  |
| Supabase Studio | http://localhost:54323 |

> **Docker Compose alternative:** `docker compose up --build` (uses raw postgres, no Supabase Studio)

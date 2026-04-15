#!/usr/bin/env bash
# setup-local.sh — one-command local dev bootstrap
# Usage: bash scripts/setup-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   IT Management System — Local Setup         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# 1. Check prerequisites
for cmd in docker node pnpm; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌  '$cmd' is not installed. Please install it and re-run."
    exit 1
  fi
done
echo "✅  Prerequisites OK (docker, node, pnpm)"

# 2. Copy env if needed
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "✅  Created .env.local from .env.example — review before continuing."
else
  echo "⏭   .env.local already exists — skipping copy."
fi

# 3. Install dependencies
echo ""
echo "📦  Installing dependencies..."
pnpm install

# 4. Start Postgres + Redis
echo ""
echo "🐳  Starting Docker services (Postgres:54321, Redis:6379)..."
docker compose up -d postgres redis

# 5. Wait for Postgres to be healthy
echo "⏳  Waiting for Postgres to be ready..."
RETRIES=20
until docker compose exec postgres pg_isready -U it_admin -d it_management &>/dev/null || [ "$RETRIES" -eq 0 ]; do
  sleep 1
  RETRIES=$((RETRIES - 1))
done
if [ "$RETRIES" -eq 0 ]; then
  echo "❌  Postgres did not become healthy in time. Check: docker compose logs postgres"
  exit 1
fi
echo "✅  Postgres is ready."

# 6. Run migrations
echo ""
echo "🗄   Running database migrations..."
node scripts/migrate-local.mjs

# 7. Seed test data
echo ""
echo "🌱  Seeding test data..."
node scripts/seed.mjs

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ✅  Setup complete!                        ║"
echo "║                                              ║"
echo "║   Start the app:  pnpm run dev               ║"
echo "║   Open:           http://localhost:3000       ║"
echo "║                                              ║"
echo "║   Test accounts:                             ║"
echo "║     admin@itms.local   / Admin1234!          ║"
echo "║     staff@itms.local   / Staff1234!          ║"
echo "║     user@itms.local    / User1234!           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

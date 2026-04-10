# Required GitHub Secrets

Configure these in Settings → Secrets and variables → Actions:

## Supabase

- `SUPABASE_API_KEY` — Personal access token from app.supabase.com/account/tokens (used as `SUPABASE_ACCESS_TOKEN` by the Supabase CLI)
- `SUPABASE_PROJECT_REF` — Project ref from the Supabase dashboard URL (e.g. `abcdefghijklmnop`)
- `SUPABASE_DB_PASSWORD` — Database password from Supabase project settings

## Railway

- `RAILWAY_TOKEN` — API token from railway.app/account/tokens
- `RAILWAY_SERVICE_ID` — Service ID from Railway project settings
- `RAILWAY_API_URL` — Public URL of deployed API (e.g. https://api.yourapp.railway.app)

## Vercel

- `VERCEL_TOKEN` — Token from vercel.com/account/tokens
- `VERCEL_ORG_ID` — From `.vercel/project.json` after `vercel link`
- `VERCEL_PROJECT_ID` — From `.vercel/project.json` after `vercel link`
- `VERCEL_URL` — Production URL (e.g. https://yourapp.vercel.app)

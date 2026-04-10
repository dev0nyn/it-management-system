# Required GitHub Secrets

Configure these in Settings → Secrets and variables → Actions:

## Supabase

- `SUPABASE_ACCESS_TOKEN` — Personal access token from app.supabase.com/account/tokens
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

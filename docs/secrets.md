# CI/CD Secrets Reference

All secrets are stored in GitHub Actions repository secrets (Settings > Secrets and variables > Actions). No secret is ever committed to the repository.

## Required Secrets

### Supabase (migrations — `migrate` job)

| Secret | Description |
|--------|-------------|
| `SUPABASE_PROJECT_REF` | Supabase project reference ID (found in Project Settings > General) |
| `SUPABASE_DB_PASSWORD` | Database password for the Supabase project |
| `SUPABASE_API_KEY` | Supabase access token used to authenticate the CLI (`SUPABASE_ACCESS_TOKEN`) |

### Vercel (web deployment — `deploy-web` job)

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel personal access token (Account Settings > Tokens) |
| `VERCEL_ORG_ID` | Vercel team/org ID (found in team settings or `.vercel/project.json`) |
| `VERCEL_PROJECT_ID` | Vercel project ID (found in project settings or `.vercel/project.json`) |
| `VERCEL_APP_URL` | Public URL of the deployed Vercel app (e.g. `https://app.example.com`) — used for smoke tests |

### Railway (API deployment — `deploy-api` job)

| Secret | Description |
|--------|-------------|
| `RAILWAY_API_TOKEN` | Railway API token (Account Settings > Tokens) |
| `RAILWAY_SERVICE_NAME` | Name of the Railway service to deploy (e.g. `api`) |
| `RAILWAY_API_URL` | Public URL of the deployed Railway API (e.g. `https://api.example.up.railway.app`) — used for smoke tests |

## Adding a New Secret

1. Go to the GitHub repo > Settings > Secrets and variables > Actions.
2. Click "New repository secret".
3. Add the secret name and value.
4. Add the secret name to this file with a description in the same PR that introduces it.

# Coolify Deploy

This project is ready to deploy on Coolify with the `Dockerfile` build pack.

## Coolify Settings

- Build Pack: `Dockerfile`
- Base Directory: `/`
- Port: `3000`
- Health Check Path: `/api/health`

## Environment Variables

Set these in Coolify if you need live Supabase features later:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `POSTGRES_URL`

For the current homepage-only build, none of them are strictly required.

## Notes

- The app listens on `0.0.0.0:3000` inside the container.
- Production image uses Next.js `standalone` output for smaller deploys.
- Health checks return JSON from `/api/health`.

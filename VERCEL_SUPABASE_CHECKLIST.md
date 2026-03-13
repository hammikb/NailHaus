# NailHaus Vercel + Supabase checklist

## What changed
- Frontend API calls now work both locally and on Vercel server-side rendering.
- Supabase auth routes now use the anon client for password sign-in.
- Added a Vercel config at the repo root.
- Added a `scripts/seed-supabase.mjs` importer so you can move demo data from `backend/data/db.json` into Supabase.

## Vercel project setup
1. Import this repo into Vercel.
2. If Vercel asks for a Root Directory, set it to `frontend`.
3. Framework preset should be **Next.js**.
4. Build command: `npm run build`
5. Install command: `npm install`

If you keep the project root at the repo root instead, use the included `vercel.json`.

## Required Vercel environment variables
Add these in Vercel → Project Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` = your production URL, for example `https://nailhaus.vercel.app`

## Supabase setup
1. Create a new Supabase project.
2. Open the SQL Editor.
3. Run `supabase-schema.sql`.
4. In Authentication → Providers, keep Email enabled.
5. In Authentication → URL Configuration, add your Vercel production URL and local URL.

## Optional demo-data import
From the repo root, after adding env vars locally:

```bash
node scripts/seed-supabase.mjs
```

This imports the sample users, vendors, products, orders, reviews, and shipments from `backend/data/db.json`.

## Local run
Create `frontend/.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then run:

```bash
cd frontend
npm install
npm run dev
```

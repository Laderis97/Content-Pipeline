# Crew Accommodations Planner

### Quickstart

1) **Supabase**: run `supabase/schema.sql` then `supabase/policies.sql`. Seed `airports`, `hotels`, one `airlines` row, and an active `contract_constraints` with `rules` from `constraints.sample.json`.

2) **Edge Functions**: `supabase functions deploy eta` and `hotel-source`.

3) **App**: copy `.env.example` → `.env`, set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`, `MAPS_API_KEY`.

4) **Dev**: `pnpm i` → `pnpm dev` → `GET /health`.

5) **Plan**: `POST /api/plan` with body `{ pairing: <object like pairings.sample.json[0]> }`.

6) **Book**: `POST /api/bookings` with `{ pairingId, hotelId }`.

### Notes

- Ranking uses ETA + rating + nightly (weights in `src/scoring.ts`).
- Contract rules are JSONB in `contract_constraints.rules`.
- ETAs are cached per pairing via Edge `eta`.

### Environment Setup

Copy `.env.example` to `.env` and configure:
- `PORT`: Server port (default: 8080)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE`: Supabase service role key
- `MAPS_API_KEY`: Google Maps API key
- `OPENAI_API_KEY`: OpenAI API key

## Deploy to Render

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. Connect to Render
- Go to [Render](https://render.com) and sign up/login
- Click "New +" and select "Web Service"
- Connect your GitHub repository
- Render will auto-detect the `render.yaml` configuration

### 3. Set Environment Variables
In Render dashboard, add these environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `MAPS_API_KEY`: Your Google Maps API key
- `OPENAI_API_KEY`: Your OpenAI API key

### 4. Deploy
Click "Create Web Service" and Render will automatically build and deploy your app!

# Worlds 2026 Live

A live League of Legends Worlds 2026 tracker: schedule, results, Play-In bracket, Swiss and knockout views, team profiles, recaps and statistics. Built with Next.js (App Router), strict TypeScript, Tailwind CSS, Zod, TanStack Query and optional Supabase.

Fan project. Not affiliated with or endorsed by Riot Games.

## What is real and what is not

- Match, schedule, score and VOD data come from the LoL Esports service behind lolesports.com. Nothing is invented. A match that the source calls "live" far from its scheduled start is shown as **unverified**.
- Champion picks per game come from Riot's live stats feed (ingested by the sync job for new games, with a seed in `src/data/games-seed.json`; winners per game are not in the feed).
- Per-game winners and MVP are not in the official feed, so they are not shown.
- Without Supabase the app still works in **cache-only mode** (live upstream data, short in-memory cache, no admin edits, no sync history).
- Liquipedia is **not enabled**. See "Secondary source" below.

## Architecture

```
          lolesports API  ──(retry, validate, normalize)──┐
                                                          ▼
 GitHub Actions cron (5 min) ─► POST /api/sync ─► idempotent upsert ─► Supabase (matches, recaps, overrides, sync_runs)
 lazy refresh on request  ───►                                          │ Realtime (postgres_changes)
                                                                        ▼
                         /api/public/snapshot (CORS, ETag) ◄── Next.js UI (polling fallback 20s live / 90s idle)
                                   ▲
                                   └── read-only Instinct mirror page (fetches this JSON, falls back to its baked snapshot)
```

- **Sync direction is one way**: official source -> database -> every UI. The Instinct mirror only reads. Admin edits in this app are stored as *overrides* and show up in the snapshot, so they reach the mirror too, but nothing writes back into the Instinct page itself.
- **Idempotent**: each match has a stable upstream id and a fingerprint. Re-running a sync with identical data writes nothing.
- **Conflict rule**: official data wins. A manual override applies only while the match has not changed upstream since the override was saved. If upstream changes later, the override is held back, flagged in the admin panel, and never silently overwrites newer verified data.
- **Failure handling**: 3 attempts with exponential backoff, then the failure is recorded in `sync_runs`; the last good data stays on screen and the header badge shows "Source error, showing cached data".
- **Freshness UI**: header badge shows last successful sync, last attempt, last error, source and storage mode.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

Validation: `npm run validate` (lint, typecheck, tests, production build).

### Environment variables

See `.env.example`. Required in production: `SESSION_SECRET`, `ADMIN_PASSWORD` (12+ chars), `SYNC_SECRET`, `NEXT_PUBLIC_SITE_URL`. Optional but recommended: the three Supabase variables.

### Database (Supabase)

1. Create a project at supabase.com.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor.
3. Copy the project URL, anon key and service role key into Vercel env vars. The service role key is server only; never expose it to the browser.

### Deploy on Vercel

1. Import this GitHub repo in Vercel (defaults are fine).
2. Add the env vars above, then redeploy.
3. In the GitHub repo settings add the Actions secret `SYNC_SECRET` (same value) and the Actions variable `SITE_URL` (your Vercel URL). `.github/workflows/sync.yml` then calls `/api/sync` every 5 minutes. (Vercel Hobby cron is limited to once a day, so `vercel.json` only holds a daily fallback; to use it set `CRON_SECRET` equal to `SYNC_SECRET`.)

### Admin

`/admin` is protected by a signed, HttpOnly, SameSite=Strict session cookie issued after a password check (rate limited, constant-time compare). Write endpoints re-check the session and the request origin. Admin can add manual score/time corrections and editorial recaps (needs Supabase), and see sync history.

### Instinct sync workflow

The Instinct-hosted page is a static File with no backend or database. It can only make browser fetches to origins declared in its `file.json`. The mirror therefore:

1. declares this deployment's origin as an allowed API origin,
2. fetches `/api/public/snapshot` on load and every minute,
3. falls back to its baked snapshot if the fetch fails, and labels it as stale.

`/api/public/snapshot` is public, read-only and credential-free, so it answers with `Access-Control-Allow-Origin: *` (hosted pages run on per-revision `*.instinctusercontent.com` subdomains, so an allowlist cannot work). `CORS_ALLOW_ORIGINS` is no longer needed.

Team logos in `public/logos` are the official team images from the LoL Esports team data; they belong to their owners.

### Secondary source (Liquipedia)

Liquipedia's terms require a custom User-Agent with contact info, at most 1 request per 2 s (1 per 30 s for `action=parse`), aggressive caching, CC-BY-SA attribution, and no automated access to HTML pages. The LiquipediaDB API needs an approved key. Because no contact/key has been provided, the adapter is intentionally **not wired in**. When enabled it must only fill gaps (for example MVP), be labeled unofficial, and rank below official data.

## Tests

`tests/` covers match-state normalization (including the early-"live" check), record computation, sync idempotency, upstream-failure fallback, override conflict rules, retry, admin auth and rate limiting.

## Known limitations

- Rate limiting is per serverless instance, not global.
- Browser reminders only fire while the tab is open; the `.ics` download is the durable option.
- Play-In round labels follow the 4-team double-elimination format in schedule order; the feed does not publish bracket links. Knockout rounds are shown as columns without connector lines for the same reason.
- No community predictions: predictions are personal and stored on the device.
- Team logos are loaded from Riot's static CDN as supplied by the official feed.

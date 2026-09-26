# ClipCutter

Cut a clip out of a video you own: upload, pick a start/end range, choose a fast lossless
stream-copy cut or a frame-accurate re-encode, and download the result. Long-running FFmpeg
work always happens in a separate persistent worker — never inside a serverless request.

```
User → Next.js (Vercel) → API → PostgreSQL
                              → Redis / BullMQ → FFmpeg Worker (Railway/Render/Fly/VPS)
                                                        ↓
                                              S3 / R2 (temporary storage)
                                                        ↓
                                          Signed, expiring download URL
```

## Stack

- **Frontend/API**: Next.js 14 (App Router), React, TypeScript, Tailwind, deployed to Vercel
- **Worker**: standalone Node process with `fluent-ffmpeg`, deployed anywhere Docker runs
- **Data**: PostgreSQL via Prisma, Redis via BullMQ
- **Storage**: any S3-compatible bucket (Cloudflare R2 or AWS S3), via signed URLs only

## Project layout

```
app/            Next.js pages + API routes (App Router)
components/     UI components (editor, dashboard, ui primitives)
lib/            Auth, storage, validation, rate limiting, errors, limits
services/       FFmpeg/FFprobe service (the only place that shells out to media tools)
workers/        The persistent BullMQ worker (clip-worker.ts)
queues/         BullMQ queue definitions shared by API + worker
db/             Prisma client singleton
prisma/         schema.prisma
scripts/        cleanup-expired.ts, make-admin.ts
tests/          Unit tests + an opt-in full-pipeline integration test
```

## Local development

Requirements: Node 20+, Docker.

```bash
# 1. Install dependencies
npm install

# 2. Copy env and adjust if needed (defaults match docker-compose)
cp .env.example .env

# 3. Start Postgres, Redis, and MinIO (local S3)
docker compose up -d postgres redis minio minio-init

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Start the Next.js app
npm run dev

# 6. In a second terminal, start the worker
npm run worker:dev
```

The app runs at http://localhost:3000. MinIO's console is at http://localhost:9001
(user/pass: `minioadmin` / `minioadmin`).

To promote your account to admin (unlocks `/admin`):

```bash
npm run make-admin -- you@example.com
```

### Running everything in Docker instead

```bash
docker compose up --build
```

This builds and runs Postgres, Redis, MinIO, the Next.js app, and the worker together. Run
migrations once against the containerized Postgres: `DATABASE_URL=postgresql://clipcutter:clipcutter@localhost:5432/clipcutter npx prisma migrate deploy`.

## Testing

```bash
npm test              # unit tests (validation, timecode math, limits) — fast, no infra needed
RUN_INTEGRATION=1 npm test   # also runs the full upload→job→worker→download pipeline test,
                              # which needs the app + worker + docker-compose services running
                              # and a tiny fixture at tests/fixtures/sample.mp4
```

## Production deployment

### 1. Database (PostgreSQL)

Use any managed Postgres (Neon, Supabase, RDS, Railway). Set `DATABASE_URL`, then:

```bash
npx prisma migrate deploy
```

### 2. Redis

Any managed Redis (Upstash, Redis Cloud, Railway). Set `REDIS_URL`.

### 3. Object storage (Cloudflare R2 or AWS S3)

Create a bucket. For R2, set `S3_ENDPOINT` to your R2 endpoint, `S3_REGION=auto`, and
`S3_FORCE_PATH_STYLE=true`. For AWS S3, leave `S3_ENDPOINT` unset, set a real `S3_REGION`,
and `S3_FORCE_PATH_STYLE=false`.

### 4. Frontend + API → Vercel

```bash
vercel deploy --prod
```

Set all variables from `.env.example` in the Vercel project settings **except** point the
worker-only variables (`WORKER_CONCURRENCY`) wherever the worker actually runs. Vercel only
hosts the Next.js app and its API routes — it never runs FFmpeg jobs directly.

### 5. Worker → Railway / Render / Fly.io / any Docker host

Build and run the `worker` target of the Dockerfile:

```bash
docker build --target worker -t clipcutter-worker .
docker run --env-file .env clipcutter-worker
```

On Railway/Render/Fly, point the service at this repo with the Dockerfile's `worker` build
target and the same environment variables as the Vercel deployment (`DATABASE_URL`,
`REDIS_URL`, `S3_*`). Scale `WORKER_CONCURRENCY` and the number of worker instances to match
load; BullMQ handles multiple workers pulling from the same queue safely.

### 6. Cleanup cron

Run the expiry cleanup on a schedule (Railway cron, a GitHub Action, or any scheduler) —
hourly is reasonable:

```bash
npm run cleanup
```

### 7. Stripe (optional)

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_ID_PREMIUM`, then point a
Stripe webhook at `POST /api/billing/webhook`. Without these set, the app runs fully on the
Free plan and `/api/billing/checkout` returns a clear "not configured" error instead of
failing unpredictably.

## Security notes

- Storage, database, and Redis credentials are only ever read server-side (`lib/storage.ts`,
  `db/client.ts`, `lib/redis.ts`) and never sent to the browser.
- All FFmpeg invocations go through `services/ffmpeg.service.ts`, which uses `fluent-ffmpeg`'s
  structured argument API — user input is never concatenated into a shell string.
- Uploaded file names are validated to reject path separators before being used to build
  storage keys (`lib/validation.ts`, `lib/storage.ts`).
- Every plan limit (file size, clip duration, resolution, job quota, concurrency) is read from
  environment variables in `lib/limits.ts` — nothing is hardcoded elsewhere in the app.
- The UI only ever labels a clip "No Re-Encoding" when the worker actually stream-copied it;
  `Clip.wasReencoded` is set from the real ffmpeg call, not assumed from the requested mode.

## What's intentionally out of scope for v1

- OAuth providers are wired for (see the comment in `lib/auth.ts`) but not implemented for a
  specific provider — add one under `app/api/auth/oauth/[provider]/route.ts`.
- Only a Stripe webhook + checkout session are included; a full billing portal UI is not.

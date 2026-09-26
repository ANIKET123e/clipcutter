import { describe, it, expect, beforeAll } from 'vitest';

/**
 * This suite exercises the real end-to-end pipeline against local infrastructure:
 *   Upload -> Analyze -> Create job -> Queue -> Worker -> FFmpeg -> Storage -> Download
 *
 * It intentionally does NOT mock Postgres/Redis/S3 — the whole point is to catch
 * integration bugs between the API, the queue, and the worker's real ffmpeg calls.
 *
 * Run with local infra up:
 *   docker compose up -d postgres redis minio minio-init
 *   npm run prisma:migrate
 *   npm run worker:dev &          # in a second terminal
 *   npm run dev &                 # in a third terminal
 *   RUN_INTEGRATION=1 npm run test
 *
 * The suite is skipped by default so `npm test` stays fast and hermetic in CI
 * unless RUN_INTEGRATION=1 is set (e.g. a dedicated CI job with docker-compose services).
 */
const RUN = process.env.RUN_INTEGRATION === '1';
const BASE_URL = process.env.TEST_APP_URL ?? 'http://localhost:3000';

describe.skipIf(!RUN)('end-to-end clip pipeline', () => {
  let cookie: string;
  let mediaId: string;
  let jobId: string;

  beforeAll(async () => {
    const email = `test-${Date.now()}@example.com`;
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'integration-test-password' })
    });
    expect(res.ok).toBe(true);
    cookie = res.headers.get('set-cookie') ?? '';
  });

  it('uploads a small fixture video, analyzes it, and reports READY', async () => {
    // A tiny valid MP4 fixture is expected at tests/fixtures/sample.mp4 (a few seconds, checked into the repo).
    const fs = await import('fs/promises');
    const file = await fs.readFile('tests/fixtures/sample.mp4');

    const initRes = await fetch(`${BASE_URL}/api/media/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ fileName: 'sample.mp4', mimeType: 'video/mp4', fileSize: file.byteLength })
    });
    const init = await initRes.json();
    expect(initRes.ok).toBe(true);
    mediaId = init.mediaId;

    const putRes = await fetch(init.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': 'video/mp4' } });
    expect(putRes.ok).toBe(true);

    const completeRes = await fetch(`${BASE_URL}/api/media/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ mediaId })
    });
    expect(completeRes.ok).toBe(true);

    let status = 'ANALYZING';
    for (let i = 0; i < 30 && status !== 'READY'; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const res = await fetch(`${BASE_URL}/api/media/${mediaId}`, { headers: { cookie } });
      status = (await res.json()).status;
    }
    expect(status).toBe('READY');
  }, 60_000);

  it('creates a job, processes it, and produces a downloadable clip', async () => {
    const jobRes = await fetch(`${BASE_URL}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ mediaId, startSec: 0, endSec: 1, cutMode: 'FAST_COPY', outputFormat: 'MP4' })
    });
    const job = await jobRes.json();
    expect(jobRes.ok).toBe(true);
    jobId = job.jobId;

    let status = 'QUEUED';
    let clipId: string | null = null;
    for (let i = 0; i < 60 && status !== 'COMPLETED' && status !== 'FAILED'; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const res = await fetch(`${BASE_URL}/api/jobs/${jobId}`, { headers: { cookie } });
      const data = await res.json();
      status = data.status;
      clipId = data.clipId;
    }
    expect(status).toBe('COMPLETED');
    expect(clipId).toBeTruthy();

    const clipRes = await fetch(`${BASE_URL}/api/clips/${clipId}`, { headers: { cookie } });
    const clip = await clipRes.json();
    expect(clipRes.ok).toBe(true);
    expect(clip.downloadUrl).toMatch(/^https?:\/\//);
  }, 90_000);
});

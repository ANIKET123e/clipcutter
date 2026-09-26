import 'dotenv/config';
import { Worker, Job as BullJob } from 'bullmq';
import { randomUUID } from 'crypto';
import { mkdtemp, rm, stat } from 'fs/promises';
import { createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/db/client';
import { redis } from '@/lib/redis';
import { s3Client, bucketName, buildObjectKey } from '@/lib/storage';
import { probeMedia, cutMedia } from '@/services/ffmpeg.service';
import { CLIP_QUEUE_NAME, type ClipJobPayload } from '@/queues/clip-queue';
import { ANALYSIS_QUEUE_NAME, type AnalysisJobPayload } from '@/queues/analysis-queue';
import { limits } from '@/lib/limits';
import { logError } from '@/lib/errors';

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 2);

async function downloadToTemp(storageKey: string, destPath: string) {
  const res = await s3Client.send(new GetObjectCommand({ Bucket: bucketName(), Key: storageKey }));
  if (!res.Body) throw new Error('Empty object body from storage');
  await pipeline(res.Body as NodeJS.ReadableStream, createWriteStream(destPath));
}

async function uploadFromTemp(localPath: string, storageKey: string, contentType: string) {
  const { createReadStream } = await import('fs');
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: storageKey,
      Body: createReadStream(localPath),
      ContentType: contentType
    })
  );
}

const outputExt: Record<string, string> = { MP4: 'mp4', WEBM: 'webm', MP3: 'mp3', M4A: 'm4a', OGG: 'ogg', OPUS: 'opus' };
const outputMime: Record<string, string> = {
  MP4: 'video/mp4',
  WEBM: 'video/webm',
  MP3: 'audio/mpeg',
  M4A: 'audio/mp4',
  OGG: 'audio/ogg',
  OPUS: 'audio/opus'
};

// ---------------------------------------------------------------------------
// Analysis worker: ffprobe only, fast, sets Media.status READY|FAILED
// ---------------------------------------------------------------------------
const analysisWorker = new Worker<AnalysisJobPayload>(
  ANALYSIS_QUEUE_NAME,
  async (bullJob) => {
    const media = await prisma.media.findUnique({ where: { id: bullJob.data.mediaId } });
    if (!media) return;

    const dir = await mkdtemp(join(tmpdir(), 'cc-probe-'));
    const localPath = join(dir, `source.bin`);
    try {
      await downloadToTemp(media.storageKey, localPath);
      const probe = await probeMedia(localPath);

      await prisma.media.update({
        where: { id: media.id },
        data: {
          status: 'READY',
          durationSec: probe.durationSec,
          width: probe.width,
          height: probe.height,
          fps: probe.fps,
          videoCodec: probe.videoCodec,
          audioCodec: probe.audioCodec,
          bitrateKbps: probe.bitrateKbps,
          container: probe.container
        }
      });
    } catch (err) {
      await prisma.media.update({
        where: { id: media.id },
        data: { status: 'FAILED', errorMessage: 'We could not read this video file. It may be corrupt or in an unsupported format.' }
      });
      logError({ requestId: randomUUID(), category: 'FFMPEG', message: err instanceof Error ? err.message : 'analysis failed' });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
  { connection: redis, concurrency: CONCURRENCY }
);

// ---------------------------------------------------------------------------
// Clip worker: download -> ffmpeg cut -> upload -> Clip row -> cleanup
// ---------------------------------------------------------------------------
const clipWorker = new Worker<ClipJobPayload>(
  CLIP_QUEUE_NAME,
  async (bullJob: BullJob<ClipJobPayload>) => {
    const job = await prisma.job.findUnique({ where: { id: bullJob.data.jobId }, include: { media: true } });
    if (!job) return;

    async function isCancelled() {
      const current = await prisma.job.findUnique({ where: { id: job!.id }, select: { status: true } });
      return current?.status === 'CANCELLED';
    }

    const dir = await mkdtemp(join(tmpdir(), 'cc-job-'));
    const inputPath = join(dir, 'input.bin');
    const clipId = randomUUID();
    const ext = outputExt[job.outputFormat];
    const outputPath = join(dir, `output.${ext}`);
    const startedAt = new Date();

    try {
      await prisma.job.update({ where: { id: job.id }, data: { status: 'DOWNLOADING', stage: 'Downloading source', startedAt, progress: 5 } });
      if (await isCancelled()) return;
      await downloadToTemp(job.media.storageKey, inputPath);

      await prisma.job.update({ where: { id: job.id }, data: { status: 'PROCESSING', stage: 'Cutting video', progress: 10 } });
      if (await isCancelled()) return;

      const { wasReencoded } = await cutMedia({
        inputPath,
        outputPath,
        startSec: job.startSec,
        endSec: job.endSec,
        cutMode: job.cutMode,
        outputFormat: job.outputFormat,
        onProgress: (percent) => {
          // ffmpeg progress mapped into the 10-80% band; download/upload cover the rest
          const scaled = 10 + Math.round((percent / 100) * 70);
          void prisma.job.update({ where: { id: job.id }, data: { progress: Math.min(80, scaled) } }).catch(() => undefined);
        }
      });

      if (await isCancelled()) return;

      await prisma.job.update({ where: { id: job.id }, data: { status: 'UPLOADING', stage: 'Uploading clip', progress: 85 } });

      const storageKey = buildObjectKey({ userId: job.userId, kind: 'clip', id: clipId, ext });
      await uploadFromTemp(outputPath, storageKey, outputMime[job.outputFormat]);

      const stats = await stat(outputPath);
      const probe = await probeMedia(outputPath).catch(() => null);

      await prisma.$transaction([
        prisma.clip.create({
          data: {
            id: clipId,
            userId: job.userId,
            jobId: job.id,
            storageKey,
            format: job.outputFormat,
            durationSec: job.endSec - job.startSec,
            width: probe?.width ?? null,
            height: probe?.height ?? null,
            fileSize: BigInt(stats.size),
            wasReencoded,
            expiresAt: new Date(Date.now() + limits.fileExpiryHours * 3600 * 1000)
          }
        }),
        prisma.job.update({
          where: { id: job.id },
          data: { status: 'COMPLETED', stage: 'Completed', progress: 100, completedAt: new Date() }
        })
      ]);
    } catch (err) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorCategory: 'FFMPEG',
          errorMessage: 'We could not process this clip. Please check the selected range and try again.'
        }
      });
      logError({
        requestId: randomUUID(),
        userId: job.userId,
        jobId: job.id,
        category: 'FFMPEG',
        message: err instanceof Error ? err.message : 'clip processing failed'
      });
      throw err; // let BullMQ apply retry/backoff policy
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
  { connection: redis, concurrency: CONCURRENCY }
);

// ---------------------------------------------------------------------------
// Stalled-job recovery: BullMQ marks stalled jobs itself when a worker dies
// mid-processing; we just make sure our DB status doesn't get stuck.
// ---------------------------------------------------------------------------
clipWorker.on('stalled', async (jobId) => {
  logError({ requestId: randomUUID(), category: 'WORKER', message: `Job stalled: ${jobId}` });
});

clipWorker.on('failed', async (bullJob) => {
  if (!bullJob) return;
  const attemptsMade = bullJob.attemptsMade;
  const maxAttempts = bullJob.opts.attempts ?? 1;
  if (attemptsMade >= maxAttempts) {
    await prisma.job.updateMany({
      where: { id: bullJob.data.jobId, status: { notIn: ['CANCELLED', 'COMPLETED'] } },
      data: { status: 'FAILED', stage: 'Failed after retries' }
    });
  }
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
async function shutdown() {
  // eslint-disable-next-line no-console
  console.log('Worker shutting down gracefully...');
  await Promise.all([clipWorker.close(), analysisWorker.close()]);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// eslint-disable-next-line no-console
console.log(`ClipCutter worker running (concurrency=${CONCURRENCY})`);

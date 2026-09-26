import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { startOfDay } from '@/lib/date';
import { prisma } from '@/db/client';
import { requireUser } from '@/lib/auth';
import { createJobSchema } from '@/lib/validation';
import { enforceRateLimit, clientKeyFrom } from '@/lib/rate-limit';
import { limits, OUTPUT_FORMATS_VIDEO } from '@/lib/limits';
import { enqueueClipJob } from '@/queues/clip-queue';
import { toSafeApiError, logError, Errors } from '@/lib/errors';

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  try {
    const user = await requireUser();
    await enforceRateLimit(`jobcreate:${clientKeyFrom(req, user.id)}`, limits.rateLimits.jobCreatePerMin);

    const body = createJobSchema.parse(await req.json());

    const media = await prisma.media.findUnique({ where: { id: body.mediaId } });
    if (!media || media.userId !== user.id) throw Errors.notFound('Media');
    if (media.status !== 'READY') throw Errors.invalidInput('This video is not ready to be clipped yet.');

    // Validate the requested range against real, ffprobe-derived duration.
    if (media.durationSec != null && (body.startSec >= media.durationSec || body.endSec > media.durationSec)) {
      throw Errors.invalidTimestamps();
    }

    const clipDuration = body.endSec - body.startSec;
    if (clipDuration > limits.maxClipDurationSec[user.plan]) {
      throw Errors.invalidInput(`Your plan allows clips up to ${Math.floor(limits.maxClipDurationSec[user.plan] / 60)} minutes.`);
    }

    if (media.height != null && media.height > limits.maxResolutionHeight[user.plan]) {
      throw Errors.invalidInput('This resolution exceeds what your plan supports.');
    }

    const isVideoOutput = (OUTPUT_FORMATS_VIDEO as readonly string[]).includes(body.outputFormat);
    if (!isVideoOutput && body.cutMode === 'FAST_COPY') {
      // Stream-copy only makes sense for like-for-like video containers; audio extraction always re-encodes.
      throw Errors.invalidInput('Fast cut is only available for video outputs. Use Frame Accurate for audio extraction.');
    }

    // Daily job quota + concurrency check.
    const day = startOfDay(new Date());
    const usage = await prisma.usage.findUnique({ where: { userId_day: { userId: user.id, day } } });
    if ((usage?.jobsCreated ?? 0) >= limits.maxDailyJobs[user.plan]) {
      throw Errors.invalidInput("You've reached your daily job limit for your plan.");
    }

    const activeCount = await prisma.job.count({
      where: { userId: user.id, status: { in: ['QUEUED', 'DOWNLOADING', 'ANALYZING', 'PROCESSING', 'UPLOADING'] } }
    });
    if (activeCount >= limits.maxConcurrentJobs[user.plan]) {
      throw Errors.invalidInput('You already have the maximum number of jobs processing for your plan.');
    }

    const job = await prisma.job.create({
      data: {
        userId: user.id,
        mediaId: media.id,
        startSec: body.startSec,
        endSec: body.endSec,
        cutMode: body.cutMode,
        outputFormat: body.outputFormat,
        status: 'QUEUED'
      }
    });

    await prisma.usage.upsert({
      where: { userId_day: { userId: user.id, day } },
      update: { jobsCreated: { increment: 1 } },
      create: { userId: user.id, day, jobsCreated: 1 }
    });

    const bullJob = await enqueueClipJob(job.id);
    await prisma.job.update({ where: { id: job.id }, data: { bullJobId: bullJob.id } });

    return NextResponse.json({ jobId: job.id, status: job.status });
  } catch (err) {
    if (err && typeof err === 'object' && 'issues' in err) {
      return NextResponse.json({ error: 'Please check the selected range and try again.', category: 'VALIDATION' }, { status: 400 });
    }
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

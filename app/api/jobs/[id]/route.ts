import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/db/client';
import { requireUser } from '@/lib/auth';
import { enforceRateLimit, clientKeyFrom } from '@/lib/rate-limit';
import { limits } from '@/lib/limits';
import { toSafeApiError, logError, Errors } from '@/lib/errors';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = randomUUID();
  try {
    const user = await requireUser();
    await enforceRateLimit(`api:${clientKeyFrom(req, user.id)}`, limits.rateLimits.apiPerMin);
    const job = await prisma.job.findUnique({ where: { id: params.id }, include: { media: true, clip: true } });
    if (!job || job.userId !== user.id) throw Errors.notFound('Job');

    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      startSec: job.startSec,
      endSec: job.endSec,
      cutMode: job.cutMode,
      outputFormat: job.outputFormat,
      errorMessage: job.status === 'FAILED' ? job.errorMessage : null,
      media: { id: job.media.id, originalName: job.media.originalName },
      clipId: job.clip?.id ?? null,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt
    });
  } catch (err) {
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/db/client';
import { requireUser } from '@/lib/auth';
import { cancelQueuedJob } from '@/queues/clip-queue';
import { toSafeApiError, logError, Errors } from '@/lib/errors';

const CANCELLABLE = ['QUEUED', 'DOWNLOADING', 'ANALYZING', 'PROCESSING', 'UPLOADING'];

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = randomUUID();
  try {
    const user = await requireUser();
    const job = await prisma.job.findUnique({ where: { id: params.id } });
    if (!job || job.userId !== user.id) throw Errors.notFound('Job');
    if (!CANCELLABLE.includes(job.status)) throw Errors.invalidInput('This job can no longer be cancelled.');

    if (job.bullJobId) await cancelQueuedJob(job.bullJobId);

    // Always flip the DB flag: an already-running worker polls this each
    // progress tick and stops cleanly even if it couldn't be pulled from queue.
    await prisma.job.update({ where: { id: job.id }, data: { status: 'CANCELLED', stage: 'Cancelled by user' } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

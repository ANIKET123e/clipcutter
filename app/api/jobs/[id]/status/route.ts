import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/db/client';
import { requireUser } from '@/lib/auth';
import { toSafeApiError, logError, Errors } from '@/lib/errors';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = randomUUID();
  try {
    const user = await requireUser();
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, status: true, progress: true, stage: true, errorMessage: true }
    });
    if (!job || job.userId !== user.id) throw Errors.notFound('Job');

    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      errorMessage: job.status === 'FAILED' ? job.errorMessage : null
    });
  } catch (err) {
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

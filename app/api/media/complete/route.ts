import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/db/client';
import { requireUser } from '@/lib/auth';
import { mediaCompleteSchema } from '@/lib/validation';
import { headObject } from '@/lib/storage';
import { enqueueAnalysis } from '@/queues/analysis-queue';
import { toSafeApiError, logError, Errors } from '@/lib/errors';

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  try {
    const user = await requireUser();
    const body = mediaCompleteSchema.parse(await req.json());

    const media = await prisma.media.findUnique({ where: { id: body.mediaId } });
    if (!media || media.userId !== user.id) throw Errors.notFound('Media');

    const head = await headObject(media.storageKey);
    if (!head) throw Errors.invalidInput("We couldn't find the uploaded file in storage yet. Please retry in a moment.");

    await prisma.media.update({
      where: { id: media.id },
      data: { status: 'ANALYZING' }
    });

    await enqueueAnalysis(media.id);

    return NextResponse.json({ mediaId: media.id, status: 'ANALYZING' });
  } catch (err) {
    if (err && typeof err === 'object' && 'issues' in err) {
      return NextResponse.json({ error: 'Please check your input and try again.', category: 'VALIDATION' }, { status: 400 });
    }
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

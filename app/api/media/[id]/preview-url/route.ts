import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/db/client';
import { requireUser } from '@/lib/auth';
import { createSignedDownloadUrl } from '@/lib/storage';
import { toSafeApiError, logError, Errors } from '@/lib/errors';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = randomUUID();
  try {
    const user = await requireUser();
    const media = await prisma.media.findUnique({ where: { id: params.id } });
    if (!media || media.userId !== user.id) throw Errors.notFound('Media');
    if (media.status !== 'READY') throw Errors.invalidInput('This video is still being analyzed.');

    const url = await createSignedDownloadUrl(media.storageKey, 60 * 30);
    return NextResponse.json({ url });
  } catch (err) {
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/db/client';
import { requireUser } from '@/lib/auth';
import { deleteObject } from '@/lib/storage';
import { toSafeApiError, logError, Errors } from '@/lib/errors';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = randomUUID();
  try {
    const user = await requireUser();
    const media = await prisma.media.findUnique({ where: { id: params.id } });
    if (!media || media.userId !== user.id) throw Errors.notFound('Media');

    return NextResponse.json({
      id: media.id,
      status: media.status,
      originalName: media.originalName,
      fileSize: media.fileSize.toString(),
      durationSec: media.durationSec,
      width: media.width,
      height: media.height,
      fps: media.fps,
      videoCodec: media.videoCodec,
      audioCodec: media.audioCodec,
      bitrateKbps: media.bitrateKbps,
      container: media.container,
      errorMessage: media.status === 'FAILED' ? media.errorMessage : null
    });
  } catch (err) {
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = randomUUID();
  try {
    const user = await requireUser();
    const media = await prisma.media.findUnique({ where: { id: params.id } });
    if (!media || media.userId !== user.id) throw Errors.notFound('Media');

    await deleteObject(media.storageKey);
    await prisma.media.update({ where: { id: media.id }, data: { status: 'DELETED' } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

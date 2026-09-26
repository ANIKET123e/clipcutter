import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/db/client';
import { requireUser } from '@/lib/auth';
import { createSignedDownloadUrl, deleteObject } from '@/lib/storage';
import { enforceRateLimit, clientKeyFrom } from '@/lib/rate-limit';
import { limits } from '@/lib/limits';
import { toSafeApiError, logError, Errors } from '@/lib/errors';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = randomUUID();
  try {
    const user = await requireUser();
    await enforceRateLimit(`download:${clientKeyFrom(req, user.id)}`, limits.rateLimits.downloadPerMin);

    const clip = await prisma.clip.findUnique({ where: { id: params.id } });
    if (!clip || clip.userId !== user.id || clip.deletedAt) throw Errors.notFound('Clip');
    if (clip.expiresAt < new Date()) throw Errors.expiredFile();

    const downloadUrl = await createSignedDownloadUrl(clip.storageKey, 60 * 15, `clip-${clip.id}.${clip.format.toLowerCase()}`);
    await prisma.clip.update({ where: { id: clip.id }, data: { downloadCount: { increment: 1 } } });

    return NextResponse.json({
      id: clip.id,
      format: clip.format,
      durationSec: clip.durationSec,
      width: clip.width,
      height: clip.height,
      fileSize: clip.fileSize.toString(),
      wasReencoded: clip.wasReencoded,
      processingModeLabel: clip.wasReencoded ? 'Frame Accurate' : 'No Re-Encoding',
      expiresAt: clip.expiresAt,
      downloadUrl
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
    const clip = await prisma.clip.findUnique({ where: { id: params.id } });
    if (!clip || clip.userId !== user.id) throw Errors.notFound('Clip');

    await deleteObject(clip.storageKey);
    await prisma.clip.update({ where: { id: clip.id }, data: { deletedAt: new Date() } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { prisma } from '@/db/client';
import { requireUser } from '@/lib/auth';
import { mediaUploadInitSchema } from '@/lib/validation';
import { buildObjectKey, createSignedUploadUrl } from '@/lib/storage';
import { enforceRateLimit, clientKeyFrom } from '@/lib/rate-limit';
import { limits } from '@/lib/limits';
import { toSafeApiError, logError, Errors } from '@/lib/errors';

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  try {
    const user = await requireUser();
    await enforceRateLimit(`upload:${clientKeyFrom(req, user.id)}`, limits.rateLimits.uploadPerMin);

    const body = mediaUploadInitSchema.parse(await req.json());

    const maxSize = limits.maxFileSizeBytes[user.plan];
    if (body.fileSize > maxSize) throw Errors.fileTooLarge();

    const mediaId = randomUUID();
    const ext = extname(body.fileName).replace('.', '') || 'mp4';
    const storageKey = buildObjectKey({ userId: user.id, kind: 'source', id: mediaId, ext });

    const media = await prisma.media.create({
      data: {
        id: mediaId,
        userId: user.id,
        storageKey,
        originalName: body.fileName,
        mimeType: body.mimeType,
        fileSize: BigInt(body.fileSize),
        status: 'PENDING_UPLOAD',
        expiresAt: new Date(Date.now() + limits.fileExpiryHours * 3600 * 1000)
      }
    });

    const uploadUrl = await createSignedUploadUrl(storageKey, body.mimeType, maxSize);

    return NextResponse.json({ mediaId: media.id, uploadUrl, storageKey });
  } catch (err) {
    if (err && typeof err === 'object' && 'issues' in err) {
      return NextResponse.json({ error: 'Please check the file details and try again.', category: 'VALIDATION' }, { status: 400 });
    }
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

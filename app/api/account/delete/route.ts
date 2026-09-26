import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/db/client';
import { requireUser, destroySession } from '@/lib/auth';
import { deleteObject } from '@/lib/storage';
import { toSafeApiError, logError } from '@/lib/errors';

export async function DELETE() {
  const requestId = randomUUID();
  try {
    const user = await requireUser();

    const [media, clips] = await Promise.all([
      prisma.media.findMany({ where: { userId: user.id } }),
      prisma.clip.findMany({ where: { userId: user.id } })
    ]);
    await Promise.all([...media.map((m) => deleteObject(m.storageKey)), ...clips.map((c) => deleteObject(c.storageKey))]);

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.user.update({
        where: { id: user.id },
        data: { deletedAt: new Date(), email: `deleted-${user.id}@clipcutter.invalid`, passwordHash: '', apiKeyHash: null }
      })
    ]);

    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

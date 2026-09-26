import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/db/client';
import { requireUser, generateApiKey } from '@/lib/auth';
import { toSafeApiError, logError } from '@/lib/errors';

export async function POST() {
  const requestId = randomUUID();
  try {
    const user = await requireUser();
    const { raw, hash } = generateApiKey();
    await prisma.user.update({ where: { id: user.id }, data: { apiKeyHash: hash } });
    return NextResponse.json({ apiKey: raw });
  } catch (err) {
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

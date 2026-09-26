import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/db/client';
import { verifyPassword, createSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { enforceRateLimit, clientKeyFrom } from '@/lib/rate-limit';
import { toSafeApiError, logError, Errors } from '@/lib/errors';
import { limits } from '@/lib/limits';

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  try {
    await enforceRateLimit(`auth:${clientKeyFrom(req)}`, limits.rateLimits.authPerMin);

    const body = loginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    // Constant-shape response whether the email exists or not, to avoid user enumeration.
    if (!user || user.deletedAt || !(await verifyPassword(body.password, user.passwordHash))) {
      throw Errors.invalidInput('Incorrect email or password.');
    }

    await createSession(user.id, {
      userAgent: req.headers.get('user-agent') ?? undefined,
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined
    });

    return NextResponse.json({ id: user.id, email: user.email, name: user.name, plan: user.plan });
  } catch (err) {
    if (err && typeof err === 'object' && 'issues' in err) {
      return NextResponse.json({ error: 'Please check your input and try again.', category: 'VALIDATION' }, { status: 400 });
    }
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

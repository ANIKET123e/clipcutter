import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/db/client';
import { Errors } from './errors';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'clipcutter_session';
const SESSION_TTL_DAYS = 30;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, meta: { userAgent?: string; ipAddress?: string }) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt, userAgent: meta.userAgent, ipAddress: meta.ipAddress }
  });

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt
  });
}

export async function destroySession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookies().delete(COOKIE_NAME);
}

/** Resolves the current session's user, or null. Never throws for a missing/invalid session. */
export async function getCurrentUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });

  if (!session || session.expiresAt < new Date() || session.user.deletedAt) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw Errors.unauthorized();
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw Errors.forbidden();
  return user;
}

/** API key auth for programmatic/premium access. Keys are stored only as salted hashes. */
export async function verifyApiKey(rawKey: string) {
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const user = await prisma.user.findUnique({ where: { apiKeyHash: keyHash } });
  if (!user || user.deletedAt) return null;
  return user;
}

export function generateApiKey() {
  const raw = `cc_${randomBytes(24).toString('hex')}`;
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

/*
 * OAuth-ready: to add a provider (Google/GitHub/etc.), add an `oauthAccounts`
 * relation on User (provider, providerAccountId) and a callback route under
 * app/api/auth/oauth/[provider]/route.ts that exchanges the code, upserts the
 * user, and calls createSession() exactly as email/password login does below.
 */

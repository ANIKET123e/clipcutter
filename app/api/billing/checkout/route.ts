import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/db/client';
import { requireUser } from '@/lib/auth';
import { toSafeApiError, logError, AppError } from '@/lib/errors';

export async function POST() {
  const requestId = randomUUID();
  try {
    const user = await requireUser();

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new AppError('INTERNAL', 501, 'Billing is not configured yet on this deployment.');
    }

    // Lazy import so the app runs without the `stripe` package installed until billing is actually enabled.
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    let subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
      customerId = customer.id;
      subscription = await prisma.subscription.upsert({
        where: { userId: user.id },
        update: { stripeCustomerId: customerId },
        create: { userId: user.id, stripeCustomerId: customerId }
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID_PREMIUM, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgraded=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    const { status, body } = toSafeApiError(err);
    logError({ requestId, category: body.category, message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(body, { status });
  }
}

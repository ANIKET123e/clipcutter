import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/db/client';
import { logError } from '@/lib/errors';

export const runtime = 'nodejs'; // needed for raw body access

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Billing is not configured on this deployment.' }, { status: 501 });
  }

  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' });
    const event = stripe.webhooks.constructEvent(rawBody, signature ?? '', secret);

    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as { customer: string; id: string; status: string; current_period_end: number };
        const record = await prisma.subscription.findUnique({ where: { stripeCustomerId: sub.customer } });
        if (record) {
          const isActive = sub.status === 'active' || sub.status === 'trialing';
          await prisma.$transaction([
            prisma.subscription.update({
              where: { userId: record.userId },
              data: {
                stripeSubscriptionId: sub.id,
                status: sub.status,
                plan: isActive ? 'PREMIUM' : 'FREE',
                currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null
              }
            }),
            prisma.user.update({ where: { id: record.userId }, data: { plan: isActive ? 'PREMIUM' : 'FREE' } })
          ]);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as { customer: string };
        const record = await prisma.subscription.findUnique({ where: { stripeCustomerId: sub.customer } });
        if (record) {
          await prisma.$transaction([
            prisma.subscription.update({ where: { userId: record.userId }, data: { status: 'canceled', plan: 'FREE' } }),
            prisma.user.update({ where: { id: record.userId }, data: { plan: 'FREE' } })
          ]);
        }
        break;
      }
      default:
        break; // unhandled event types are ignored, not errors
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logError({ requestId, category: 'INTERNAL', message: err instanceof Error ? err.message : 'stripe webhook failed' });
    return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
  }
}

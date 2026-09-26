import { NextRequest } from 'next/server';
import { prisma } from '@/db/client';
import { requireUser } from '@/lib/auth';
import { Errors } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const job = await prisma.job.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!job || job.userId !== user.id) throw Errors.notFound('Job');

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const interval = setInterval(async () => {
        try {
          const current = await prisma.job.findUnique({
            where: { id: params.id },
            select: { status: true, progress: true, stage: true, errorMessage: true }
          });
          if (!current) {
            send({ status: 'FAILED', progress: 0, stage: null, errorMessage: 'Job no longer exists.' });
            clearInterval(interval);
            closed = true;
            controller.close();
            return;
          }
          send(current);
          if (['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(current.status)) {
            clearInterval(interval);
            closed = true;
            controller.close();
          }
        } catch {
          clearInterval(interval);
          closed = true;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      }, 1000);

      _req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}

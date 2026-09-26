import { Queue, QueueEvents } from 'bullmq';
import { redis } from '@/lib/redis';

export const CLIP_QUEUE_NAME = 'clip-processing';

export interface ClipJobPayload {
  jobId: string; // Prisma Job.id — the worker looks up everything else from the DB
}

export const clipQueue = new Queue<ClipJobPayload>(CLIP_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 24 * 3600 }
  }
});

export const clipQueueEvents = new QueueEvents(CLIP_QUEUE_NAME, { connection: redis });

export async function enqueueClipJob(jobId: string) {
  return clipQueue.add('process-clip', { jobId }, { jobId });
}

export async function cancelQueuedJob(bullJobId: string) {
  const job = await clipQueue.getJob(bullJobId);
  if (!job) return false;
  const state = await job.getState();
  if (state === 'waiting' || state === 'delayed') {
    await job.remove();
    return true;
  }
  // Already active: the worker checks Job.status in the DB each progress tick
  // and will stop cleanly if it sees CANCELLED (see workers/clip-worker.ts).
  return false;
}

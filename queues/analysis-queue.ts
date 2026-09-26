import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';

export const ANALYSIS_QUEUE_NAME = 'media-analysis';

export interface AnalysisJobPayload {
  mediaId: string;
}

export const analysisQueue = new Queue<AnalysisJobPayload>(ANALYSIS_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 3000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 24 * 3600 }
  }
});

export async function enqueueAnalysis(mediaId: string) {
  return analysisQueue.add('analyze-media', { mediaId }, { jobId: `analyze-${mediaId}` });
}

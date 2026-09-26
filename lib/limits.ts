import type { Plan } from '@prisma/client';

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const limits = {
  fileExpiryHours: num('FILE_EXPIRY_HOURS', 24),

  maxFileSizeBytes: {
    FREE: num('MAX_FILE_SIZE_FREE_MB', 500) * 1024 * 1024,
    PREMIUM: num('MAX_FILE_SIZE_PREMIUM_MB', 5000) * 1024 * 1024
  } satisfies Record<Plan, number>,

  maxClipDurationSec: {
    FREE: num('MAX_CLIP_DURATION_FREE_SEC', 600),
    PREMIUM: num('MAX_CLIP_DURATION_PREMIUM_SEC', 7200)
  } satisfies Record<Plan, number>,

  maxDailyJobs: {
    FREE: num('MAX_DAILY_JOBS_FREE', 10),
    PREMIUM: num('MAX_DAILY_JOBS_PREMIUM', 500)
  } satisfies Record<Plan, number>,

  maxResolutionHeight: {
    FREE: num('MAX_RESOLUTION_HEIGHT_FREE', 1080),
    PREMIUM: num('MAX_RESOLUTION_HEIGHT_PREMIUM', 4320)
  } satisfies Record<Plan, number>,

  maxConcurrentJobs: {
    FREE: num('MAX_CONCURRENT_JOBS_FREE', 1),
    PREMIUM: num('MAX_CONCURRENT_JOBS_PREMIUM', 5)
  } satisfies Record<Plan, number>,

  rateLimits: {
    authPerMin: num('RATE_LIMIT_AUTH_PER_MIN', 10),
    uploadPerMin: num('RATE_LIMIT_UPLOAD_PER_MIN', 5),
    jobCreatePerMin: num('RATE_LIMIT_JOB_CREATE_PER_MIN', 10),
    apiPerMin: num('RATE_LIMIT_API_PER_MIN', 120),
    downloadPerMin: num('RATE_LIMIT_DOWNLOAD_PER_MIN', 30)
  }
};

export const ACCEPTED_UPLOAD_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg'
];

export const OUTPUT_FORMATS_VIDEO = ['MP4', 'WEBM'] as const;
export const OUTPUT_FORMATS_AUDIO = ['MP3', 'M4A', 'OGG', 'OPUS'] as const;

import { describe, it, expect } from 'vitest';
import { limits } from '@/lib/limits';

describe('plan limits', () => {
  it('gives premium a larger file size allowance than free', () => {
    expect(limits.maxFileSizeBytes.PREMIUM).toBeGreaterThan(limits.maxFileSizeBytes.FREE);
  });

  it('gives premium a longer max clip duration than free', () => {
    expect(limits.maxClipDurationSec.PREMIUM).toBeGreaterThan(limits.maxClipDurationSec.FREE);
  });

  it('gives premium a higher daily job quota than free', () => {
    expect(limits.maxDailyJobs.PREMIUM).toBeGreaterThan(limits.maxDailyJobs.FREE);
  });

  it('gives premium more concurrent jobs than free', () => {
    expect(limits.maxConcurrentJobs.PREMIUM).toBeGreaterThanOrEqual(limits.maxConcurrentJobs.FREE);
  });

  it('exposes all rate limit categories required by the spec', () => {
    expect(limits.rateLimits).toMatchObject({
      authPerMin: expect.any(Number),
      uploadPerMin: expect.any(Number),
      jobCreatePerMin: expect.any(Number),
      apiPerMin: expect.any(Number),
      downloadPerMin: expect.any(Number)
    });
  });
});

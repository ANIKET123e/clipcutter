import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, mediaUploadInitSchema, createJobSchema } from '@/lib/validation';

describe('registerSchema', () => {
  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({ email: 'Test@Example.com', password: 'longenoughpassword' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('test@example.com'); // normalized
  });

  it('rejects a short password', () => {
    const result = registerSchema.safeParse({ email: 'test@example.com', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({ email: 'not-an-email', password: 'longenoughpassword' });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('requires both fields', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });
});

describe('mediaUploadInitSchema', () => {
  it('rejects file names containing path separators (path traversal)', () => {
    const result = mediaUploadInitSchema.safeParse({ fileName: '../../etc/passwd', mimeType: 'video/mp4', fileSize: 1000 });
    expect(result.success).toBe(false);
  });

  it('rejects unsupported mime types', () => {
    const result = mediaUploadInitSchema.safeParse({ fileName: 'clip.exe', mimeType: 'application/x-msdownload', fileSize: 1000 });
    expect(result.success).toBe(false);
  });

  it('accepts a valid video upload request', () => {
    const result = mediaUploadInitSchema.safeParse({ fileName: 'clip.mp4', mimeType: 'video/mp4', fileSize: 1_000_000 });
    expect(result.success).toBe(true);
  });
});

describe('createJobSchema', () => {
  it('rejects end time before start time', () => {
    const result = createJobSchema.safeParse({ mediaId: 'ckv1234567890abcdefghijk', startSec: 10, endSec: 5, cutMode: 'FAST_COPY', outputFormat: 'MP4' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid range', () => {
    const result = createJobSchema.safeParse({ mediaId: 'ckv1234567890abcdefghijk', startSec: 5, endSec: 10, cutMode: 'FAST_COPY', outputFormat: 'MP4' });
    expect(result.success).toBe(true);
  });
});

import { z } from 'zod';
import { ACCEPTED_UPLOAD_MIME_TYPES, OUTPUT_FORMATS_AUDIO, OUTPUT_FORMATS_VIDEO } from './limits';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(200),
  name: z.string().trim().min(1).max(120).optional()
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200)
});

export const mediaUploadInitSchema = z.object({
  fileName: z
    .string()
    .min(1)
    .max(255)
    // block path traversal / separators outright
    .regex(/^[^/\\]+$/, 'File name must not contain path separators'),
  mimeType: z.enum(ACCEPTED_UPLOAD_MIME_TYPES as [string, ...string[]]),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024 * 1024) // hard ceiling; plan limit enforced separately
});

export const mediaCompleteSchema = z.object({
  mediaId: z.string().cuid()
});

const outputFormatSchema = z.enum([...OUTPUT_FORMATS_VIDEO, ...OUTPUT_FORMATS_AUDIO] as [string, ...string[]]);

export const createJobSchema = z
  .object({
    mediaId: z.string().cuid(),
    startSec: z.number().min(0),
    endSec: z.number().positive(),
    cutMode: z.enum(['FAST_COPY', 'FRAME_ACCURATE']),
    outputFormat: outputFormatSchema
  })
  .refine((data) => data.endSec > data.startSec, {
    message: 'End time must be after start time',
    path: ['endSec']
  });

export const jobIdParamSchema = z.object({ id: z.string().cuid() });

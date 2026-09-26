export type ErrorCategory =
  | 'VALIDATION'
  | 'AUTH'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'STORAGE'
  | 'QUEUE'
  | 'WORKER'
  | 'FFMPEG'
  | 'INTERNAL';

export class AppError extends Error {
  readonly category: ErrorCategory;
  readonly statusCode: number;
  readonly userMessage: string;

  constructor(category: ErrorCategory, statusCode: number, userMessage: string, internalMessage?: string) {
    super(internalMessage ?? userMessage);
    this.category = category;
    this.statusCode = statusCode;
    this.userMessage = userMessage;
    this.name = 'AppError';
  }
}

export const Errors = {
  invalidInput: (msg = 'That request is not valid. Please check the values and try again.') =>
    new AppError('VALIDATION', 400, msg),
  unauthorized: () => new AppError('AUTH', 401, 'Please sign in to continue.'),
  forbidden: () => new AppError('AUTH', 403, "You don't have access to this resource."),
  notFound: (thing = 'Resource') => new AppError('NOT_FOUND', 404, `${thing} was not found.`),
  rateLimited: () => new AppError('RATE_LIMIT', 429, 'Too many requests. Please slow down and try again shortly.'),
  fileTooLarge: () => new AppError('VALIDATION', 413, 'That file is larger than your plan allows.'),
  unsupportedFormat: () => new AppError('VALIDATION', 415, "That file format isn't supported."),
  invalidTimestamps: () => new AppError('VALIDATION', 400, 'The selected start and end times are not valid for this video.'),
  storageFailure: () => new AppError('STORAGE', 502, 'We could not reach storage right now. Please try again.'),
  queueFailure: () => new AppError('QUEUE', 503, 'The processing queue is unavailable. Please try again shortly.'),
  workerUnavailable: () => new AppError('WORKER', 503, 'No processing worker is available right now. Please try again shortly.'),
  processingFailed: () => new AppError('FFMPEG', 500, 'We could not process that video. Please check the file and try again.'),
  expiredFile: () => new AppError('NOT_FOUND', 410, 'This file has expired and is no longer available.'),
  internal: () => new AppError('INTERNAL', 500, 'Something went wrong on our end. Please try again.')
};

/** Structured, safe server-side log line. Never include secrets or stack traces with credentials. */
export function logError(params: {
  requestId: string;
  userId?: string | null;
  jobId?: string | null;
  category: ErrorCategory;
  message: string;
  ffmpegExitCode?: number | null;
  durationMs?: number;
}) {
  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify({
      level: 'error',
      requestId: params.requestId,
      userId: params.userId ?? null,
      jobId: params.jobId ?? null,
      category: params.category,
      message: params.message,
      ffmpegExitCode: params.ffmpegExitCode ?? null,
      durationMs: params.durationMs ?? null,
      timestamp: new Date().toISOString()
    })
  );
}

export function toSafeApiError(err: unknown): { status: number; body: { error: string; category: ErrorCategory } } {
  if (err instanceof AppError) {
    return { status: err.statusCode, body: { error: err.userMessage, category: err.category } };
  }
  return { status: 500, body: { error: 'Something went wrong on our end. Please try again.', category: 'INTERNAL' } };
}

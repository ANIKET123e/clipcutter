import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Errors } from './errors';

function env(name: string, required = true): string {
  const v = process.env[name];
  if (!v && required) throw new Error(`Missing required env var ${name}`);
  return v ?? '';
}

const client = new S3Client({
  region: env('S3_REGION', false) || 'auto',
  endpoint: env('S3_ENDPOINT', false) || undefined,
  forcePathStyle: env('S3_FORCE_PATH_STYLE', false) === 'true',
  credentials: {
    accessKeyId: env('S3_ACCESS_KEY'),
    secretAccessKey: env('S3_SECRET_KEY')
  }
});

const BUCKET = () => env('S3_BUCKET');

/** Builds a namespaced, collision-resistant object key. Never derived from unsanitized user input. */
export function buildObjectKey(params: { userId: string; kind: 'source' | 'clip'; id: string; ext: string }) {
  const safeExt = params.ext.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin';
  return `${params.kind}s/${params.userId}/${params.id}.${safeExt}`;
}

export async function createSignedUploadUrl(key: string, contentType: string, maxSizeBytes: number) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      ContentType: contentType,
      ContentLengthRange: undefined // enforced app-side (see MEDIA API validation) since not all S3-compatible providers support this header
    });
    const url = await getSignedUrl(client, command, { expiresIn: 60 * 10 }); // 10 minutes to complete upload
    return url;
  } catch {
    throw Errors.storageFailure();
  }
}

export async function createSignedDownloadUrl(key: string, expiresInSeconds = 60 * 15, downloadFilename?: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      ResponseContentDisposition: downloadFilename ? `attachment; filename="${downloadFilename.replace(/"/g, '')}"` : undefined
    });
    return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  } catch {
    throw Errors.storageFailure();
  }
}

export async function headObject(key: string) {
  try {
    return await client.send(new HeadObjectCommand({ Bucket: BUCKET(), Key: key }));
  } catch {
    return null;
  }
}

export async function deleteObject(key: string) {
  try {
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
  } catch {
    // Deletion failures during cleanup are logged by the caller, not fatal to the request.
  }
}

export const s3Client = client;
export const bucketName = BUCKET;

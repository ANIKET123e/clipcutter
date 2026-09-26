import 'dotenv/config';
import { prisma } from '@/db/client';
import { deleteObject } from '@/lib/storage';

async function main() {
  const now = new Date();

  const expiredClips = await prisma.clip.findMany({ where: { expiresAt: { lt: now }, deletedAt: null } });
  for (const clip of expiredClips) {
    await deleteObject(clip.storageKey);
    await prisma.clip.update({ where: { id: clip.id }, data: { deletedAt: now } });
  }

  const expiredMedia = await prisma.media.findMany({
    where: { expiresAt: { lt: now }, status: { notIn: ['DELETED', 'EXPIRED'] } }
  });
  for (const media of expiredMedia) {
    await deleteObject(media.storageKey);
    await prisma.media.update({ where: { id: media.id }, data: { status: 'EXPIRED' } });
  }

  // Abandoned uploads: PENDING_UPLOAD for more than 1 hour never got a /complete call.
  const abandonedCutoff = new Date(now.getTime() - 60 * 60 * 1000);
  const abandoned = await prisma.media.findMany({
    where: { status: 'PENDING_UPLOAD', createdAt: { lt: abandonedCutoff } }
  });
  for (const media of abandoned) {
    await deleteObject(media.storageKey);
    await prisma.media.update({ where: { id: media.id }, data: { status: 'EXPIRED' } });
  }

  // Failed jobs older than a day: nothing to keep around in storage.
  await prisma.job.updateMany({
    where: { status: 'FAILED', updatedAt: { lt: new Date(now.getTime() - 24 * 3600 * 1000) } },
    data: {} // placeholder for any future FAILED-job artifact cleanup
  });

  // eslint-disable-next-line no-console
  console.log(`Cleanup complete: ${expiredClips.length} clips, ${expiredMedia.length} media, ${abandoned.length} abandoned uploads.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Cleanup failed', err);
  process.exit(1);
});

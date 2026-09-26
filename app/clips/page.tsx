import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/db/client';
import { AppShell } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { ClipsList } from '@/components/dashboard/clips-list';

export default async function ClipsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const clips = await prisma.clip.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-semibold">Clips</h1>
        <Card>
          <ClipsList
            initialClips={clips.map((c) => ({
              id: c.id,
              format: c.format,
              durationSec: c.durationSec,
              fileSize: c.fileSize.toString(),
              wasReencoded: c.wasReencoded,
              expiresAt: c.expiresAt.toISOString()
            }))}
          />
        </Card>
      </div>
    </AppShell>
  );
}

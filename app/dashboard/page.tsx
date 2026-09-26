import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/db/client';
import { AppShell } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/utils';
import { limits } from '@/lib/limits';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [activeJobs, recentClips, mediaAgg] = await Promise.all([
    prisma.job.findMany({
      where: { userId: user.id, status: { in: ['QUEUED', 'DOWNLOADING', 'ANALYZING', 'PROCESSING', 'UPLOADING'] } },
      orderBy: { createdAt: 'desc' },
      include: { media: true }
    }),
    prisma.clip.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.media.aggregate({ where: { userId: user.id, status: { notIn: ['DELETED', 'EXPIRED'] } }, _sum: { fileSize: true } })
  ]);

  const usedBytes = Number(mediaAgg._sum.fileSize ?? 0);
  const quotaBytes = limits.maxFileSizeBytes[user.plan] * 10; // illustrative account-level allowance

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Welcome back{user.name ? `, ${user.name}` : ''}</h1>
          <p className="text-zinc-400 text-sm mt-1">{user.email} · {user.plan === 'PREMIUM' ? 'Premium plan' : 'Free plan'}</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Storage used</p>
            <p className="mt-2 text-2xl font-display">{formatBytes(usedBytes)}</p>
            <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-violet to-accent-blue"
                style={{ width: `${Math.min(100, (usedBytes / quotaBytes) * 100)}%` }}
              />
            </div>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Active jobs</p>
            <p className="mt-2 text-2xl font-display">{activeJobs.length}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Plan</p>
            <p className="mt-2 text-2xl font-display">{user.plan === 'PREMIUM' ? 'Premium' : 'Free'}</p>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent clips</h2>
          <Link href="/clips" className="text-sm text-accent-blue hover:underline">View all</Link>
        </div>
        {recentClips.length === 0 ? (
          <Card className="text-center text-zinc-400 text-sm py-10">
            No clips yet. <Link href="/upload" className="text-accent-blue hover:underline">Upload a video</Link> to make your first one.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {recentClips.map((clip) => (
              <Card key={clip.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{clip.format} clip</p>
                  <p className="text-xs text-zinc-500 mt-1">{formatBytes(Number(clip.fileSize))}</p>
                </div>
                <Link href="/clips"><Button size="sm" variant="secondary">View</Button></Link>
              </Card>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Processing jobs</h2>
          <Link href="/jobs" className="text-sm text-accent-blue hover:underline">View all</Link>
        </div>
        {activeJobs.length === 0 ? (
          <Card className="text-center text-zinc-400 text-sm py-10">Nothing processing right now.</Card>
        ) : (
          <div className="space-y-3">
            {activeJobs.map((job) => (
              <Card key={job.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{job.media.originalName}</p>
                  <p className="text-xs text-zinc-500 mt-1">{job.stage ?? job.status}</p>
                </div>
                <Link href={`/jobs?highlight=${job.id}`}><Button size="sm" variant="secondary">Watch progress</Button></Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

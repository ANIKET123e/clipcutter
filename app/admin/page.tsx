import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/db/client';
import { clipQueue } from '@/queues/clip-queue';
import { redis } from '@/lib/redis';
import { Card } from '@/components/ui/card';
import { formatBytes } from '@/lib/utils';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const [totalUsers, activeUsersLast7d, jobCounts, storageAgg, recentFailedJobs, queueCounts, redisPing] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.session.findMany({
      where: { expiresAt: { gt: new Date() }, createdAt: { gt: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      distinct: ['userId'],
      select: { userId: true }
    }),
    prisma.job.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.media.aggregate({ _sum: { fileSize: true }, where: { status: { notIn: ['DELETED', 'EXPIRED'] } } }),
    prisma.job.findMany({ where: { status: 'FAILED' }, orderBy: { updatedAt: 'desc' }, take: 10, include: { media: true, user: true } }),
    clipQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    redis.ping().then(() => true).catch(() => false)
  ]);

  const countByStatus = Object.fromEntries(jobCounts.map((j) => [j.status, j._count.status]));

  return (
    <div className="min-h-screen bg-grid-glow px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="font-display text-2xl font-semibold">Admin</h1>

        <div className="grid sm:grid-cols-4 gap-4">
          <Stat label="Total users" value={totalUsers} />
          <Stat label="Active users (7d)" value={activeUsersLast7d.length} />
          <Stat label="Total jobs" value={jobCounts.reduce((sum, j) => sum + j._count.status, 0)} />
          <Stat label="Storage used" value={formatBytes(Number(storageAgg._sum.fileSize ?? 0))} />
        </div>

        <div className="grid sm:grid-cols-4 gap-4">
          <Stat label="Processing" value={(countByStatus['PROCESSING'] ?? 0) + (countByStatus['DOWNLOADING'] ?? 0) + (countByStatus['UPLOADING'] ?? 0)} />
          <Stat label="Queued" value={countByStatus['QUEUED'] ?? 0} />
          <Stat label="Completed" value={countByStatus['COMPLETED'] ?? 0} />
          <Stat label="Failed" value={countByStatus['FAILED'] ?? 0} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <h2 className="font-medium mb-3">Queue status</h2>
            <dl className="text-sm space-y-1 text-zinc-300">
              <Row label="Waiting" value={queueCounts.waiting} />
              <Row label="Active" value={queueCounts.active} />
              <Row label="Delayed" value={queueCounts.delayed} />
              <Row label="Failed (retained)" value={queueCounts.failed} />
            </dl>
          </Card>
          <Card>
            <h2 className="font-medium mb-3">System health</h2>
            <dl className="text-sm space-y-1 text-zinc-300">
              <Row label="Redis" value={redisPing ? 'Connected' : 'Unreachable'} status={redisPing ? 'ok' : 'bad'} />
              <Row label="Database" value="Connected" status="ok" />
            </dl>
          </Card>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Recent errors</h2>
          {recentFailedJobs.length === 0 ? (
            <Card className="text-center text-zinc-400 text-sm py-8">No recent failures.</Card>
          ) : (
            <div className="space-y-2">
              {recentFailedJobs.map((job) => (
                <Card key={job.id} className="text-sm">
                  <p className="text-zinc-200">{job.media.originalName} — {job.user.email}</p>
                  <p className="text-red-400 mt-1">{job.errorMessage}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-display">{value}</p>
    </Card>
  );
}

function Row({ label, value, status }: { label: string; value: string | number; status?: 'ok' | 'bad' }) {
  return (
    <div className="flex justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={status === 'bad' ? 'text-red-400' : status === 'ok' ? 'text-emerald-400' : ''}>{value}</dd>
    </div>
  );
}

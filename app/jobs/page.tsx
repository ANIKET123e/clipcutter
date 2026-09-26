import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/db/client';
import { AppShell } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { JobCard } from '@/components/dashboard/job-card';

export default async function JobsPage({ searchParams }: { searchParams: { highlight?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { media: true, clip: true }
  });

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-semibold">Jobs</h1>
        {jobs.length === 0 ? (
          <Card className="text-center text-zinc-400 text-sm py-10">No jobs yet.</Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                id={job.id}
                initialStatus={job.status}
                initialProgress={job.progress}
                mediaName={job.media.originalName}
                clipId={job.clip?.id}
                highlighted={searchParams.highlight === job.id}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

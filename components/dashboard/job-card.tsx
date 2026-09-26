'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface JobCardProps {
  id: string;
  initialStatus: string;
  initialProgress: number;
  mediaName: string;
  clipId?: string | null;
  highlighted?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  QUEUED: 'Queued',
  DOWNLOADING: 'Downloading source',
  ANALYZING: 'Analyzing',
  PROCESSING: 'Processing',
  UPLOADING: 'Uploading clip',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired'
};

const ACTIVE = new Set(['QUEUED', 'DOWNLOADING', 'ANALYZING', 'PROCESSING', 'UPLOADING']);

export function JobCard({ id, initialStatus, initialProgress, mediaName, clipId, highlighted }: JobCardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedClipId, setResolvedClipId] = useState(clipId ?? null);

  useEffect(() => {
    if (!ACTIVE.has(status)) return;
    const source = new EventSource(`/api/jobs/${id}/stream`);
    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data.status);
      setProgress(data.progress);
      setStage(data.stage);
      setError(data.errorMessage);
      if (data.status === 'COMPLETED') {
        fetch(`/api/jobs/${id}`)
          .then((r) => r.json())
          .then((job) => setResolvedClipId(job.clipId));
      }
      if (!ACTIVE.has(data.status)) source.close();
    };
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cancel() {
    await fetch(`/api/jobs/${id}/cancel`, { method: 'POST' });
    setStatus('CANCELLED');
  }

  return (
    <Card className={highlighted ? 'ring-1 ring-accent-violet' : ''}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{mediaName}</p>
          <p className="text-xs text-zinc-500 mt-1">{stage ?? STATUS_LABEL[status] ?? status}</p>
        </div>
        {ACTIVE.has(status) && (
          <Button size="sm" variant="ghost" onClick={cancel} aria-label="Cancel job">
            <X className="h-4 w-4" />
          </Button>
        )}
        {status === 'COMPLETED' && resolvedClipId && (
          <Link href="/clips"><Button size="sm" variant="secondary">Download</Button></Link>
        )}
      </div>
      {ACTIVE.has(status) && (
        <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent-violet to-accent-blue transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {status === 'FAILED' && error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </Card>
  );
}

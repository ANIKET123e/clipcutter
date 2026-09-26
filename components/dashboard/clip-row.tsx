'use client';

import { useState } from 'react';
import { Download, Copy, Trash2, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBytes, formatTimecode } from '@/lib/utils';

interface ClipRowProps {
  id: string;
  format: string;
  durationSec: number;
  fileSize: string;
  wasReencoded: boolean;
  expiresAt: string;
  onDeleted: (id: string) => void;
}

export function ClipRow({ id, format, durationSec, fileSize, wasReencoded, expiresAt, onDeleted }: ClipRowProps) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const expired = new Date(expiresAt) < new Date();

  async function getDownloadUrl() {
    const res = await fetch(`/api/clips/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'This clip is no longer available.');
    return data.downloadUrl as string;
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const url = await getDownloadUrl();
      window.open(url, '_blank');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not download this clip.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    setBusy(true);
    try {
      const url = await getDownloadUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not copy link.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this clip? This cannot be undone.')) return;
    setBusy(true);
    try {
      await fetch(`/api/clips/${id}`, { method: 'DELETE' });
      onDeleted(id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">
          {format} · {formatTimecode(durationSec)}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          {formatBytes(fileSize)} · {wasReencoded ? 'Frame Accurate' : 'No Re-Encoding'}
          {expired && <span className="text-red-400"> · Expired</span>}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={handleCopy} disabled={busy || expired} aria-label="Copy download link">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="secondary" onClick={handleDownload} disabled={busy || expired} aria-label="Download clip">
          <Download className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="danger" onClick={handleDelete} disabled={busy} aria-label="Delete clip">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

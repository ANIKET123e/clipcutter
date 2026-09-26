'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Phase = 'idle' | 'requesting' | 'uploading' | 'analyzing' | 'error';

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        setPhase('requesting');
        const initRes = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, mimeType: file.type, fileSize: file.size })
        });
        const init = await initRes.json();
        if (!initRes.ok) throw new Error(init.error ?? 'Could not start upload.');

        setPhase('uploading');
        await putWithProgress(init.uploadUrl, file, setProgress);

        const completeRes = await fetch('/api/media/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaId: init.mediaId })
        });
        const complete = await completeRes.json();
        if (!completeRes.ok) throw new Error(complete.error ?? 'Could not finalize upload.');

        setPhase('analyzing');
        await pollUntilReady(init.mediaId);
        router.push(`/editor/${init.mediaId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.');
        setPhase('error');
      }
    },
    [router]
  );

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <h1 className="font-display text-2xl font-semibold mb-6">Upload a video</h1>
        <Card
          className="border-dashed border-2 border-white/15 text-center py-16 cursor-pointer hover:border-accent-violet/50 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska,audio/mpeg,audio/mp4,audio/ogg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {phase === 'idle' && (
            <>
              <UploadCloud className="h-8 w-8 mx-auto text-accent-violet mb-3" />
              <p className="text-zinc-200 font-medium">Drop a video, or click to browse</p>
              <p className="text-sm text-zinc-500 mt-1">Only upload videos you own or have permission to process.</p>
            </>
          )}
          {(phase === 'requesting' || phase === 'uploading' || phase === 'analyzing') && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
              <p className="text-sm text-zinc-300">
                {phase === 'requesting' && 'Preparing upload…'}
                {phase === 'uploading' && `Uploading… ${progress}%`}
                {phase === 'analyzing' && 'Analyzing your video…'}
              </p>
              {phase === 'uploading' && (
                <div className="w-2/3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent-violet to-accent-blue" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          )}
          {phase === 'error' && (
            <div>
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setPhase('idle'); }}>
                Try again
              </Button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function putWithProgress(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload to storage failed.')));
    xhr.onerror = () => reject(new Error('Upload to storage failed.'));
    xhr.send(file);
  });
}

async function pollUntilReady(mediaId: string, attempt = 0): Promise<void> {
  if (attempt > 120) throw new Error('This video is taking longer than expected to analyze.');
  const res = await fetch(`/api/media/${mediaId}`);
  const data = await res.json();
  if (data.status === 'READY') return;
  if (data.status === 'FAILED') throw new Error(data.errorMessage ?? 'Could not analyze this video.');
  await new Promise((r) => setTimeout(r, 1500));
  return pollUntilReady(mediaId, attempt + 1);
}

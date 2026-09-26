'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Scissors } from 'lucide-react';
import { AppShell } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Timeline } from '@/components/editor/timeline';
import { formatTimecode, parseTimecode } from '@/lib/utils';

type OutputFormat = 'MP4' | 'WEBM' | 'MP3' | 'M4A' | 'OGG' | 'OPUS';
const VIDEO_FORMATS: OutputFormat[] = ['MP4', 'WEBM'];
const AUDIO_FORMATS: OutputFormat[] = ['MP3', 'M4A', 'OGG', 'OPUS'];

interface MediaInfo {
  id: string;
  status: string;
  originalName: string;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  container: string | null;
}

export default function EditorPage() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [format, setFormat] = useState<OutputFormat>('MP4');
  const [cutMode, setCutMode] = useState<'FAST_COPY' | 'FRAME_ACCURATE'>('FAST_COPY');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [infoRes, previewRes] = await Promise.all([
        fetch(`/api/media/${mediaId}`),
        fetch(`/api/media/${mediaId}/preview-url`)
      ]);
      const info = await infoRes.json();
      const preview = await previewRes.json();
      setMedia(info);
      setPreviewUrl(preview.url ?? null);
      if (info.durationSec) setEnd(info.durationSec);
    }
    load();
  }, [mediaId]);

  const isAudioFormat = AUDIO_FORMATS.includes(format);

  async function createClip() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, startSec: start, endSec: end, cutMode: isAudioFormat ? 'FRAME_ACCURATE' : cutMode, outputFormat: format })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not create the clip job.');
      router.push(`/jobs?highlight=${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the clip job.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!media) {
    return (
      <AppShell>
        <div className="px-6 py-16 text-center text-zinc-400">Loading…</div>
      </AppShell>
    );
  }

  if (media.status !== 'READY') {
    return (
      <AppShell>
        <div className="px-6 py-16 text-center text-zinc-400">
          {media.status === 'FAILED' ? 'This video could not be analyzed.' : 'Still analyzing this video…'}
        </div>
      </AppShell>
    );
  }

  const duration = media.durationSec ?? 0;

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">{media.originalName}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {media.width}×{media.height} · {media.fps?.toFixed(2)} fps · {media.videoCodec ?? media.audioCodec} · {media.container}
          </p>
        </div>

        <Card className="p-0 overflow-hidden">
          {previewUrl && (
            <video
              ref={videoRef}
              src={previewUrl}
              controls
              className="w-full aspect-video bg-black"
              onTimeUpdate={(e) => setPlayhead(e.currentTarget.currentTime)}
            />
          )}
        </Card>

        <Card className="space-y-4">
          <Timeline
            duration={duration}
            start={start}
            end={end}
            playhead={playhead}
            onChange={(s, e) => {
              setStart(s);
              setEnd(e);
            }}
            onSeek={(t) => {
              if (videoRef.current) videoRef.current.currentTime = t;
            }}
          />

          <div className="grid grid-cols-3 gap-4">
            <TimeField label="Start" value={start} max={end} onChange={(v) => setStart(Math.min(v, end - 0.05))} />
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Duration</span>
              <span className="timecode text-lg text-zinc-100 mt-1">{formatTimecode(end - start)}</span>
            </div>
            <TimeField label="End" value={end} min={start} maxDuration={duration} onChange={(v) => setEnd(Math.max(v, start + 0.05))} />
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Output format</p>
            <div className="flex flex-wrap gap-2">
              {[...VIDEO_FORMATS, ...AUDIO_FORMATS].map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    format === f ? 'bg-accent-violet/20 border-accent-violet text-white' : 'border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {!isAudioFormat && (
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Processing mode</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <ModeCard
                  active={cutMode === 'FAST_COPY'}
                  title="Fast Cut"
                  body="Stream copy — no re-encoding, original quality preserved. May snap to the nearest keyframe."
                  onClick={() => setCutMode('FAST_COPY')}
                />
                <ModeCard
                  active={cutMode === 'FRAME_ACCURATE'}
                  title="Frame Accurate"
                  body="Re-encodes so your exact start and end points are honored precisely."
                  onClick={() => setCutMode('FRAME_ACCURATE')}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button size="lg" className="w-full" onClick={createClip} disabled={submitting}>
            <Scissors className="h-4 w-4" />
            {submitting ? 'Creating clip…' : 'Create clip'}
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}

function TimeField({
  label,
  value,
  onChange,
  min = 0,
  max,
  maxDuration
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  maxDuration?: number;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">{label}</p>
      <Input
        className="timecode text-center"
        defaultValue={formatTimecode(value)}
        key={value}
        onBlur={(e) => {
          const parsed = parseTimecode(e.target.value);
          if (parsed == null) {
            e.target.value = formatTimecode(value);
            return;
          }
          const clamped = Math.max(min, Math.min(max ?? maxDuration ?? parsed, parsed));
          onChange(clamped);
        }}
      />
    </div>
  );
}

function ModeCard({ active, title, body, onClick }: { active: boolean; title: string; body: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-lg border transition-colors ${
        active ? 'bg-accent-violet/10 border-accent-violet' : 'border-white/10 hover:border-white/20'
      }`}
    >
      <p className="font-medium text-sm text-zinc-100">{title}</p>
      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{body}</p>
    </button>
  );
}

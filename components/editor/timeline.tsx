'use client';

import { useCallback, useRef } from 'react';

interface TimelineProps {
  duration: number;
  start: number;
  end: number;
  playhead: number;
  onChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
}

export function Timeline({ duration, start, end, playhead, onChange, onSeek }: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const pctToTime = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return pct * duration;
    },
    [duration]
  );

  function startDrag(handle: 'start' | 'end') {
    return (downEvent: React.PointerEvent) => {
      downEvent.stopPropagation();
      function onMove(e: PointerEvent) {
        const t = pctToTime(e.clientX);
        if (handle === 'start') onChange(Math.min(t, end - 0.05), end);
        else onChange(start, Math.max(t, start + 0.05));
      }
      function onUp() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
  }

  if (duration <= 0) return null;

  const startPct = (start / duration) * 100;
  const endPct = (end / duration) * 100;
  const playheadPct = (playhead / duration) * 100;

  return (
    <div
      ref={trackRef}
      className="relative h-14 rounded-lg bg-white/[0.05] border border-white/10 cursor-pointer select-none"
      onClick={(e) => onSeek(pctToTime(e.clientX))}
    >
      {/* dimmed regions outside selection */}
      <div className="absolute inset-y-0 left-0 bg-black/40 rounded-l-lg" style={{ width: `${startPct}%` }} />
      <div className="absolute inset-y-0 right-0 bg-black/40 rounded-r-lg" style={{ width: `${100 - endPct}%` }} />

      {/* selected range */}
      <div
        className="absolute inset-y-0 bg-gradient-to-r from-accent-violet/30 to-accent-blue/30 border-x-2 border-accent-violet"
        style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
      />

      {/* playhead */}
      <div className="absolute inset-y-0 w-px bg-accent-cyan" style={{ left: `${playheadPct}%` }} />

      {/* handles */}
      <div
        role="slider"
        aria-label="Start handle"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={start}
        tabIndex={0}
        onPointerDown={startDrag('start')}
        className="absolute top-0 bottom-0 w-3 -ml-1.5 bg-accent-violet rounded-sm cursor-ew-resize"
        style={{ left: `${startPct}%` }}
      />
      <div
        role="slider"
        aria-label="End handle"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={end}
        tabIndex={0}
        onPointerDown={startDrag('end')}
        className="absolute top-0 bottom-0 w-3 -ml-1.5 bg-accent-blue rounded-sm cursor-ew-resize"
        style={{ left: `${endPct}%` }}
      />
    </div>
  );
}

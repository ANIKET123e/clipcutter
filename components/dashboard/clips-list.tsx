'use client';

import { useState } from 'react';
import { ClipRow } from './clip-row';

interface ClipListItem {
  id: string;
  format: string;
  durationSec: number;
  fileSize: string;
  wasReencoded: boolean;
  expiresAt: string;
}

export function ClipsList({ initialClips }: { initialClips: ClipListItem[] }) {
  const [clips, setClips] = useState(initialClips);

  if (clips.length === 0) {
    return <p className="text-center text-zinc-400 text-sm py-10">No clips yet.</p>;
  }

  return (
    <div className="space-y-3">
      {clips.map((clip) => (
        <ClipRow key={clip.id} {...clip} onDeleted={(id) => setClips((c) => c.filter((clip) => clip.id !== id))} />
      ))}
    </div>
  );
}

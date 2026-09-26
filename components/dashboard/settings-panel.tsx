'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function SettingsPanel({ hasApiKey }: { hasApiKey: boolean }) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generateKey() {
    setBusy(true);
    try {
      const res = await fetch('/api/account/api-key', { method: 'POST' });
      const data = await res.json();
      if (res.ok) setApiKey(data.apiKey);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  async function deleteAccount() {
    if (!confirm('Delete your account permanently? This removes all your media, clips, and job history.')) return;
    setBusy(true);
    try {
      await fetch('/api/account/delete', { method: 'DELETE' });
      router.push('/');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <h2 className="font-medium mb-2">API access</h2>
        <p className="text-sm text-zinc-400 mb-4">
          {hasApiKey ? 'An API key already exists for your account. Generating a new one replaces it.' : 'Generate a key to use the ClipCutter API programmatically.'}
        </p>
        <Button variant="secondary" onClick={generateKey} disabled={busy}>
          Generate new API key
        </Button>
        {apiKey && (
          <div className="mt-4 p-3 rounded-lg bg-black/40 border border-white/10">
            <p className="text-xs text-zinc-500 mb-1">Copy this now — it won't be shown again.</p>
            <code className="text-sm text-accent-cyan break-all">{apiKey}</code>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-medium mb-4">Session</h2>
        <Button variant="secondary" onClick={logout}>Log out</Button>
      </Card>

      <Card className="border-red-500/20">
        <h2 className="font-medium mb-2 text-red-300">Danger zone</h2>
        <p className="text-sm text-zinc-400 mb-4">Deleting your account removes all media, clips, and job history. This cannot be undone.</p>
        <Button variant="danger" onClick={deleteAccount} disabled={busy}>Delete account</Button>
      </Card>
    </>
  );
}

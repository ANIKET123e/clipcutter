'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scissors } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not log in.');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-grid-glow flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <Scissors className="h-5 w-5 text-accent-violet" />
          <span className="font-display font-semibold">ClipCutter</span>
        </div>
        <h1 className="font-display text-xl font-semibold mb-6">Log in</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
        <p className="mt-6 text-sm text-zinc-400">
          No account? <Link href="/register" className="text-accent-blue hover:underline">Sign up</Link>
        </p>
      </Card>
    </div>
  );
}

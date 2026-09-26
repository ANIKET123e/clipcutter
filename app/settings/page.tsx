import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AppShell } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { SettingsPanel } from '@/components/dashboard/settings-panel';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-semibold">Settings</h1>

        <Card>
          <h2 className="font-medium mb-4">Account</h2>
          <dl className="text-sm space-y-2 text-zinc-300">
            <div className="flex justify-between"><dt className="text-zinc-500">Email</dt><dd>{user.email}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Plan</dt><dd>{user.plan === 'PREMIUM' ? 'Premium' : 'Free'}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Member since</dt><dd>{user.createdAt.toDateString()}</dd></div>
          </dl>
        </Card>

        <SettingsPanel hasApiKey={Boolean(user.apiKeyHash)} />
      </div>
    </AppShell>
  );
}

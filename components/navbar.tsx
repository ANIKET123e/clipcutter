import Link from 'next/link';
import { Scissors, LayoutDashboard, Upload, ListChecks, FolderDown, Settings } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/jobs', label: 'Jobs', icon: ListChecks },
  { href: '/clips', label: 'Clips', icon: FolderDown },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-grid-glow">
      <div className="flex">
        <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-white/[0.06] px-4 py-6">
          <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-8">
            <Scissors className="h-5 w-5 text-accent-violet" />
            <span className="font-display font-semibold text-lg">ClipCutter</span>
          </Link>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 md:ml-60 pb-20 md:pb-0">{children}</main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 glass border-t border-white/[0.08] flex justify-around py-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 px-3 py-1 text-zinc-400 hover:text-white">
            <item.icon className="h-5 w-5" />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

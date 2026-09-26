import Link from 'next/link';
import { Scissors, Zap, ShieldCheck, Gauge, FileVideo2, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const formats = [
  { label: 'MP4', kind: 'video' },
  { label: 'WebM', kind: 'video' },
  { label: 'MP3', kind: 'audio' },
  { label: 'M4A', kind: 'audio' },
  { label: 'OGG', kind: 'audio' },
  { label: 'Opus', kind: 'audio' }
];

const steps = [
  { n: 1, title: 'Upload your video', body: 'Drop in a video you own or have permission to process. It goes straight to secure storage — never through a slow intermediate server.' },
  { n: 2, title: 'Pick your range', body: 'Drag the timeline handles or type exact timestamps. See start, end, and duration update live, down to the millisecond.' },
  { n: 3, title: 'Choose your cut', body: 'Fast Cut copies the stream with no quality loss. Frame Accurate re-encodes so your exact in and out points are honored precisely.' },
  { n: 4, title: 'Download your clip', body: 'Your worker processes the job in the background — watch real progress, then download from a secure, expiring link.' }
];

const faqs = [
  { q: 'Will Fast Cut always land exactly on my chosen timestamp?', a: 'Stream copying can only cut at the nearest keyframe, so the start of a Fast Cut clip may shift by a fraction of a second. Frame Accurate mode re-encodes the clip so it starts and ends exactly where you specify.' },
  { q: 'Can I upload a video from another platform?', a: 'ClipCutter only processes videos you upload directly — files you own or are authorized to edit. It does not fetch or extract media from third-party platforms.' },
  { q: 'How long are my files kept?', a: 'Uploaded sources and generated clips are automatically deleted after a set retention window. Download your clip before it expires.' },
  { q: 'What happens to my files if I delete my account?', a: 'Account deletion removes your media, clips, and job history along with your account.' }
];

export default function LandingPage() {
  return (
    <div className="bg-grid-glow">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-accent-violet" />
          <span className="font-display font-semibold text-lg">ClipCutter</span>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-zinc-300">
          <a href="#how-it-works" className="hover:text-white">How it works</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-300 hover:text-white">Log in</Link>
          <Link href="/register"><Button size="sm">Get started</Button></Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl leading-[1.1] font-semibold text-zinc-50">
            Cut the exact moment out of your own footage.
          </h1>
          <p className="mt-5 text-zinc-400 text-lg leading-relaxed max-w-md">
            Upload a video you own, mark an in and out point, and export a clean clip in the format you need — lossless when possible, precise when it matters.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link href="/register"><Button size="lg">Start cutting free</Button></Link>
            <a href="#how-it-works" className="text-sm text-zinc-300 hover:text-white">See how it works →</a>
          </div>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="aspect-video bg-black/60 flex items-center justify-center">
            <div className="w-4/5 h-1.5 rounded-full bg-white/10 relative">
              <div className="absolute inset-y-0 left-[28%] right-[46%] bg-gradient-to-r from-accent-violet to-accent-blue rounded-full" />
              <div className="absolute -top-1.5 left-[28%] w-4 h-4 rounded-sm bg-accent-violet -translate-x-1/2" />
              <div className="absolute -top-1.5 left-[54%] w-4 h-4 rounded-sm bg-accent-blue -translate-x-1/2" />
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06] timecode text-sm text-zinc-300">
            <span>00:02:14.000</span>
            <span className="text-zinc-500">duration 00:01:28.000</span>
            <span>00:03:42.000</span>
          </div>
        </Card>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid sm:grid-cols-3 gap-6">
        {[
          { icon: Zap, title: 'Lossless when possible', body: 'Fast Cut stream-copies your video with no re-encode, keeping the exact original quality.' },
          { icon: Gauge, title: 'Frame-accurate when needed', body: 'Switch to Frame Accurate and the worker re-encodes so your in/out points land exactly.' },
          { icon: ShieldCheck, title: 'Your files, protected', body: 'Direct-to-storage uploads, expiring download links, and automatic cleanup of old files.' }
        ].map((f) => (
          <Card key={f.title}>
            <f.icon className="h-5 w-5 text-accent-blue mb-3" />
            <h3 className="font-display font-medium text-zinc-100">{f.title}</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{f.body}</p>
          </Card>
        ))}
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-display text-2xl font-semibold mb-8">How it works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="timecode text-sm text-accent-violet mb-2">{String(s.n).padStart(2, '0')}</div>
              <h3 className="font-medium text-zinc-100">{s.title}</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Formats */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-display text-2xl font-semibold mb-8">Supported formats</h2>
        <div className="flex flex-wrap gap-3">
          {formats.map((f) => (
            <span key={f.label} className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2 text-zinc-200">
              {f.kind === 'video' ? <FileVideo2 className="h-4 w-4 text-accent-blue" /> : <Music2 className="h-4 w-4 text-accent-cyan" />}
              {f.label}
            </span>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16 grid sm:grid-cols-2 gap-6 max-w-2xl">
        <Card>
          <h3 className="font-display text-xl font-semibold">Free</h3>
          <p className="mt-1 text-sm text-zinc-400">Casual clipping</p>
          <ul className="mt-5 space-y-2 text-sm text-zinc-300">
            <li>Smaller file sizes</li>
            <li>Shorter max clip length</li>
            <li>Standard resolution</li>
            <li>One job at a time</li>
          </ul>
          <Link href="/register" className="block mt-6"><Button variant="secondary" className="w-full">Start free</Button></Link>
        </Card>
        <Card className="border-accent-violet/40">
          <h3 className="font-display text-xl font-semibold">Premium</h3>
          <p className="mt-1 text-sm text-zinc-400">For frequent editors</p>
          <ul className="mt-5 space-y-2 text-sm text-zinc-300">
            <li>Larger files, longer clips</li>
            <li>Up to 8K resolution</li>
            <li>Multiple concurrent jobs</li>
            <li>Higher API limits</li>
          </ul>
          <Link href="/pricing" className="block mt-6"><Button className="w-full">See plans</Button></Link>
        </Card>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="font-display text-2xl font-semibold mb-8">Frequently asked</h2>
        <div className="space-y-6">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="font-medium text-zinc-100">{f.q}</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-3xl font-semibold">Your footage. Your cut.</h2>
        <p className="mt-3 text-zinc-400">Free to start, no credit card required.</p>
        <Link href="/register" className="inline-block mt-6"><Button size="lg">Create your first clip</Button></Link>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-8 text-sm text-zinc-500 flex flex-col sm:flex-row justify-between max-w-6xl mx-auto gap-3">
        <span>© {new Date().getFullYear()} ClipCutter</span>
        <div className="flex gap-6">
          <Link href="/api-docs" className="hover:text-zinc-300">API docs</Link>
          <Link href="/pricing" className="hover:text-zinc-300">Pricing</Link>
        </div>
      </footer>
    </div>
  );
}

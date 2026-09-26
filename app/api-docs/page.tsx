import { Card } from '@/components/ui/card';

const endpoints = [
  { method: 'POST', path: '/api/media/upload', desc: 'Start a direct-to-storage upload. Returns a signed URL to PUT the file to.' },
  { method: 'POST', path: '/api/media/complete', desc: 'Mark an upload complete; queues ffprobe analysis.' },
  { method: 'GET', path: '/api/media/:id', desc: 'Get media metadata and analysis status.' },
  { method: 'DELETE', path: '/api/media/:id', desc: 'Delete a source video.' },
  { method: 'POST', path: '/api/jobs', desc: 'Create a clip job for a READY media item.' },
  { method: 'GET', path: '/api/jobs/:id', desc: 'Get full job details, including the resulting clip ID once complete.' },
  { method: 'GET', path: '/api/jobs/:id/status', desc: 'Lightweight polling endpoint for status/progress.' },
  { method: 'GET', path: '/api/jobs/:id/stream', desc: 'Server-Sent Events stream of live job progress.' },
  { method: 'POST', path: '/api/jobs/:id/cancel', desc: 'Cancel a queued or in-progress job.' },
  { method: 'GET', path: '/api/clips/:id', desc: 'Get clip details and a fresh, short-lived signed download URL.' },
  { method: 'DELETE', path: '/api/clips/:id', desc: 'Delete a clip.' }
];

const methodColor: Record<string, string> = {
  GET: 'text-accent-blue',
  POST: 'text-accent-violet',
  DELETE: 'text-red-400'
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-grid-glow px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold">API reference</h1>
          <p className="text-zinc-400 mt-3">
            Authenticate with a session cookie (browser) or an API key via the <code className="text-accent-cyan">X-API-Key</code> header
            (generate one in Settings). The full machine-readable spec is at{' '}
            <a href="/openapi.json" className="text-accent-blue hover:underline">/openapi.json</a>.
          </p>
        </div>

        <Card>
          <h2 className="font-medium mb-3">Rate limits</h2>
          <p className="text-sm text-zinc-400">
            Limits are applied per endpoint category (auth, uploads, job creation, general API, downloads) and are higher on the
            Premium plan. Exceeding a limit returns <code className="text-accent-cyan">429</code> with category <code className="text-accent-cyan">RATE_LIMIT</code>.
          </p>
        </Card>

        <Card>
          <h2 className="font-medium mb-3">Error responses</h2>
          <p className="text-sm text-zinc-400">
            Every error is <code className="text-accent-cyan">{'{ error: string, category: string }'}</code>. Categories include
            VALIDATION, AUTH, NOT_FOUND, RATE_LIMIT, STORAGE, QUEUE, WORKER, FFMPEG, and INTERNAL. Raw server errors are never returned.
          </p>
        </Card>

        <div className="space-y-3">
          {endpoints.map((e) => (
            <Card key={e.method + e.path} className="flex items-start gap-4">
              <span className={`timecode text-sm font-medium w-16 shrink-0 ${methodColor[e.method]}`}>{e.method}</span>
              <div>
                <p className="timecode text-sm text-zinc-100">{e.path}</p>
                <p className="text-sm text-zinc-400 mt-1">{e.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

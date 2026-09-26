import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = (process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []);

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  if (req.nextUrl.pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin');
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Credentials', 'true');
      res.headers.set('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: res.headers });
    }
  }

  return res;
}

export const config = {
  matcher: '/api/:path*'
};

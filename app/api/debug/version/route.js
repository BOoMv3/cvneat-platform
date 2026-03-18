import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const res = NextResponse.json({
    ok: true,
    vercel: {
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      gitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
      env: process.env.VERCEL_ENV || null,
    },
    node: process.version,
    now: new Date().toISOString(),
  });
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  return res;
}


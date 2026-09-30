import { NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body, status = 200) {
  const r = NextResponse.json(body, { status });
  Object.entries(corsHeaders).forEach(([k, v]) => r.headers.set(k, v));
  return r;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/cvneat-plus/create-checkout
 * CVN'EAT Plus temporairement désactivé.
 */
export async function POST() {
  return json(
    { error: "CVN'EAT Plus est temporairement indisponible." },
    { status: 503 }
  );
}

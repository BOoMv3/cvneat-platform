import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getProjectRefFromUrl(url) {
  try {
    const u = new URL(url);
    // ex: https://xxxxxxxxxxxxxxxxxxxx.supabase.co
    return u.hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const projectRef = getProjectRefFromUrl(supabaseUrl);

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing Supabase env vars',
          hasUrl: !!supabaseUrl,
          hasServiceRoleKey: !!serviceRoleKey,
          projectRef,
        },
        { status: 500 }
      );
    }

    const sb = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: counts, error: countErr } = await sb
      .from('restaurants')
      .select('ouvert_manuellement, status');

    if (countErr) {
      return NextResponse.json(
        {
          ok: false,
          projectRef,
          error: countErr.message,
        },
        { status: 500 }
      );
    }

    const rows = Array.isArray(counts) ? counts : [];
    const total = rows.length;
    const active = rows.filter((r) => r?.status === 'active').length;
    const openManualTrue = rows.filter((r) => r?.ouvert_manuellement === true).length;
    const openManualTrueActive = rows.filter((r) => r?.status === 'active' && r?.ouvert_manuellement === true).length;

    const res = NextResponse.json({
      ok: true,
      projectRef,
      total,
      active,
      openManualTrue,
      openManualTrueActive,
    });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


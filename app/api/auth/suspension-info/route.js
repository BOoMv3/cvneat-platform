import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  isSuspensionActive,
  suspensionPayload,
} from '@/lib/user-suspension';

export const dynamic = 'force-dynamic';

function suspensionFromAuthUser(authUser) {
  const meta = authUser?.app_metadata || {};
  return {
    suspended_until: meta.suspended_until || null,
    suspension_reason: meta.suspension_reason || null,
    suspension_penalty_eur: meta.suspension_penalty_eur ?? 0,
  };
}

/**
 * Infos de suspension par email — pour afficher le motif
 * quand Supabase Auth renvoie "User is banned".
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '')
      .trim()
      .toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ suspended: false });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ suspended: false });
    }

    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile } = await sb
      .from('users')
      .select('id, suspended_until, suspension_reason, suspension_penalty_eur')
      .eq('email', email)
      .maybeSingle();

    let row = null;
    if (profile && (profile.suspended_until || profile.suspension_reason)) {
      row = profile;
    }

    if ((!row || !isSuspensionActive(row)) && profile?.id) {
      const { data: authData } = await sb.auth.admin.getUserById(profile.id);
      const fromAuth = suspensionFromAuthUser(authData?.user);
      if (isSuspensionActive(fromAuth)) row = fromAuth;
    }

    if (!row || !isSuspensionActive(row)) {
      return NextResponse.json({ suspended: false });
    }

    return NextResponse.json(suspensionPayload(row));
  } catch {
    return NextResponse.json({ suspended: false });
  }
}

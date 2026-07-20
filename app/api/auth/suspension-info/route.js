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

    // Ne pas sélectionner les colonnes de suspension (peuvent être absentes en prod).
    const { data: profile } = await sb
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (!profile?.id) {
      return NextResponse.json({ suspended: false });
    }

    const { data: authData } = await sb.auth.admin.getUserById(profile.id);
    const fromAuth = suspensionFromAuthUser(authData?.user);
    const bannedUntil = authData?.user?.banned_until;
    const authBanned = bannedUntil && new Date(bannedUntil).getTime() > Date.now();

    if (isSuspensionActive(fromAuth) || authBanned) {
      // Si ban Auth actif mais metadata incomplète, compléter avec banned_until
      const row = {
        suspended_until: fromAuth.suspended_until || bannedUntil || null,
        suspension_reason:
          fromAuth.suspension_reason ||
          'En raison de plusieurs plaintes sur le site, un bannissement et une pénalité automatique ont été mis en place.',
        suspension_penalty_eur: fromAuth.suspension_penalty_eur ?? 0,
      };
      return NextResponse.json(suspensionPayload(row));
    }

    return NextResponse.json({ suspended: false });
  } catch {
    return NextResponse.json({ suspended: false });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { isCvneatPlusActive } from '@/lib/cvneat-plus';
import { applyCvneatPlusFromStripeSubscription } from '@/lib/cvneat-plus-sync';
import { isAdminViewerRole, isAdminWriterRole } from '@/lib/admin-viewer';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Non autorisé', status: 401 };
  }
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { error: 'Token invalide', status: 401 };

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !isAdminViewerRole(profile.role)) {
    return { error: 'Accès refusé', status: 403 };
  }
  return { user, role: profile.role };
}

/** GET — compteur abonnés actifs (service role, hors RLS). */
export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const nowIso = new Date().toISOString();
    const { count, error } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gt('cvneat_plus_ends_at', nowIso);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: rows } = await supabaseAdmin
      .from('users')
      .select('id, email, prenom, nom, cvneat_plus_ends_at')
      .gt('cvneat_plus_ends_at', nowIso)
      .order('cvneat_plus_ends_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      activeCount: count || 0,
      subscribers: (rows || []).map((u) => ({
        id: u.id,
        email: u.email,
        name: [u.prenom, u.nom].filter(Boolean).join(' ') || u.email,
        endsAt: u.cvneat_plus_ends_at,
        active: isCvneatPlusActive(u.cvneat_plus_ends_at),
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}

/** POST — resynchronise tous les abonnements Stripe Plus → BDD. */
export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (!isAdminWriterRole(auth.role)) {
      return NextResponse.json(
        { error: 'Lecture seule : seuls les admins peuvent synchroniser' },
        { status: 403 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const results = [];
    let startingAfter = undefined;

    for (let page = 0; page < 20; page++) {
      const list = await stripe.subscriptions.list({
        status: 'all',
        limit: 100,
        starting_after: startingAfter,
      });

      for (const sub of list.data || []) {
        const product = sub.metadata?.product;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId && product !== 'cvneat_plus' && product !== 'vneat_plus') continue;
        if (!userId) continue;

        const applied = await applyCvneatPlusFromStripeSubscription(sub, supabaseAdmin);
        results.push({
          subscriptionId: sub.id,
          status: sub.status,
          userId,
          ...applied,
        });
      }

      if (!list.has_more) break;
      startingAfter = list.data[list.data.length - 1]?.id;
      if (!startingAfter) break;
    }

    const nowIso = new Date().toISOString();
    const { count } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gt('cvneat_plus_ends_at', nowIso);

    return NextResponse.json({
      synced: results.length,
      activeCount: count || 0,
      results,
    });
  } catch (e) {
    console.error('admin cvneat-plus sync:', e);
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}

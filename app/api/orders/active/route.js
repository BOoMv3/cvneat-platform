import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ACTIVE_STATUSES = new Set([
  'en_attente',
  'pending',
  'en_preparation',
  'preparation',
  'prete',
  'ready',
  'en_livraison',
  'delivering',
  'accepted',
  'confirmed',
]);

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/** GET /api/orders/active — badge « commande en cours » sans charger tout l'historique. */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.split(' ')[1];
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401, headers: corsHeaders });
    }

    const serviceClient = getServiceClient();
    if (!serviceClient) {
      return NextResponse.json({ error: 'Configuration serveur' }, { status: 500, headers: corsHeaders });
    }

    const { data: rows, error } = await serviceClient
      .from('commandes')
      .select('id, statut, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    const activeOrders = (rows || []).filter((o) => {
      const s = (o.statut || '').toString().trim().toLowerCase();
      return s && ACTIVE_STATUSES.has(s);
    });

    const res = NextResponse.json({
      hasActive: activeOrders.length > 0,
      count: activeOrders.length,
      orderIds: activeOrders.map((o) => o.id),
    });
    res.headers.set('Cache-Control', 'private, no-store, max-age=0');
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (err) {
    console.error('GET /api/orders/active:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500, headers: corsHeaders });
  }
}

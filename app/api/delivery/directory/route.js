import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDeliveryMessagingAdmin } from '@/lib/delivery-messaging';

export const dynamic = 'force-dynamic';

async function requireDelivery(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return { error: 'Non autorisé', status: 401 };
  const token = authHeader.slice(7);
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const {
    data: { user },
    error,
  } = await anon.auth.getUser(token);
  if (error || !user) return { error: 'Token invalide', status: 401 };

  const admin = getDeliveryMessagingAdmin();
  const { data: profile } = await admin.from('users').select('id, role').eq('id', user.id).maybeSingle();
  const role = (profile?.role || '').toLowerCase();
  if (!['delivery', 'livreur', 'admin'].includes(role)) {
    return { error: 'Accès livreur requis', status: 403 };
  }
  return { user, admin };
}

/** Liste des autres livreurs pour démarrer un DM */
export async function GET(request) {
  try {
    const auth = await requireDelivery(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data, error } = await auth.admin
      .from('users')
      .select('id, prenom, nom, email')
      .in('role', ['delivery', 'livreur'])
      .neq('id', auth.user.id)
      .order('prenom', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const livreurs = (data || []).map((u) => ({
      id: u.id,
      name: `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email || 'Livreur',
      email: u.email,
    }));

    return NextResponse.json({ livreurs });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

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
  if (!['delivery', 'livreur', 'admin', 'associe'].includes(role)) {
    return { error: 'Accès livreur requis', status: 403 };
  }
  return { user, admin, role };
}

/** Liste contacts : autres livreurs + 1 seul Support CVN'EAT (admin principal) */
export async function GET(request) {
  try {
    const auth = await requireDelivery(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [{ data: livreurs }, { data: admins }] = await Promise.all([
      auth.admin
        .from('users')
        .select('id, prenom, nom, email, role')
        .in('role', ['delivery', 'livreur'])
        .neq('id', auth.user.id)
        .order('prenom', { ascending: true }),
      auth.admin
        .from('users')
        .select('id, prenom, nom, email, role')
        .eq('role', 'admin')
        .neq('id', auth.user.id)
        .order('prenom', { ascending: true }),
    ]);

    // Un seul point d’entrée support (évite 2 chats « Support »)
    const preferredEmail = (process.env.CVNEAT_SUPPORT_ADMIN_EMAIL || 'admin@cvneat.fr')
      .trim()
      .toLowerCase();
    const supportAdmin =
      (admins || []).find((a) => (a.email || '').toLowerCase() === preferredEmail) ||
      (admins || []).find((a) => (a.email || '').toLowerCase().endsWith('@cvneat.fr')) ||
      (admins || [])[0] ||
      null;

    const mapLivreur = (u) => ({
      id: u.id,
      name: `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email || 'Livreur',
      email: u.email,
      kind: 'delivery',
    });

    const supportContact = supportAdmin
      ? {
          id: supportAdmin.id,
          name: "Support CVN'EAT",
          email: supportAdmin.email,
          kind: 'admin',
        }
      : null;

    return NextResponse.json({
      contacts: [
        ...(supportContact ? [supportContact] : []),
        ...(livreurs || []).map(mapLivreur),
      ],
      livreurs: (livreurs || []).map(mapLivreur),
      admins: supportContact ? [supportContact] : [],
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

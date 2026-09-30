import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminViewerRole } from '@/lib/admin-viewer';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const ACTIVE_STATUTS = [
  'en_attente',
  'acceptee',
  'en_preparation',
  'prete',
  'en_livraison',
  'assignee',
  'recuperee',
];

/**
 * GET /api/admin/live-delivery
 * Vue ops live : courses actives + recherche livreur (comme le dashboard livreur, côté admin).
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = getAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }

    const { data: me } = await admin.from('users').select('role').eq('id', user.id).maybeSingle();
    if (!me || !isAdminViewerRole(me.role)) {
      return NextResponse.json({ error: 'Accès réservé admin' }, { status: 403 });
    }

    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: orders, error: ordersError } = await admin
      .from('commandes')
      .select(`
        id,
        numero_commande,
        statut,
        payment_status,
        driver_search_status,
        livreur_id,
        restaurant_id,
        adresse_livraison,
        ville_livraison,
        code_postal_livraison,
        frais_livraison,
        total,
        customer_first_name,
        customer_last_name,
        customer_phone,
        created_at,
        delivery_requested_at,
        ready_for_delivery,
        order_fulfillment,
        restaurants ( id, nom, adresse, telephone )
      `)
      .in('statut', ACTIVE_STATUTS)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(120);

    if (ordersError) {
      console.error('live-delivery orders:', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    const list = orders || [];
    const livreurIds = [...new Set(list.map((o) => o.livreur_id).filter(Boolean))];

    let livreurById = {};
    if (livreurIds.length > 0) {
      const { data: livreurs } = await admin
        .from('users')
        .select('id, prenom, nom, telephone, email')
        .in('id', livreurIds);
      livreurById = Object.fromEntries((livreurs || []).map((l) => [l.id, l]));
    }

    const enriched = list.map((o) => ({
      ...o,
      livreur: o.livreur_id ? livreurById[o.livreur_id] || null : null,
    }));

    const { data: drivers } = await admin
      .from('users')
      .select('id, prenom, nom, telephone, email, role')
      .or('role.eq.delivery,role.eq.livreur')
      .limit(80);

    const busyIds = new Set(livreurIds);

    const searching = enriched.filter(
      (o) =>
        o.driver_search_status === 'searching' ||
        (!o.livreur_id &&
          o.order_fulfillment !== 'pickup' &&
          ['en_attente', 'acceptee', 'en_preparation', 'prete'].includes(o.statut) &&
          ['paid', 'succeeded'].includes(String(o.payment_status || '').toLowerCase()))
    );
    const assigned = enriched.filter((o) => o.livreur_id && o.statut !== 'livree');
    const inDelivery = enriched.filter((o) => o.statut === 'en_livraison' || o.statut === 'recuperee');
    const preparing = enriched.filter((o) =>
      ['acceptee', 'en_preparation', 'prete'].includes(o.statut)
    );

    const driversEnriched = (drivers || []).map((d) => ({
      ...d,
      on_active_order: busyIds.has(d.id),
    }));

    return NextResponse.json({
      updated_at: new Date().toISOString(),
      counts: {
        total_active: enriched.length,
        searching: searching.length,
        assigned: assigned.length,
        in_delivery: inDelivery.length,
        preparing: preparing.length,
        drivers_on_order: busyIds.size,
        drivers_total: driversEnriched.length,
      },
      searching,
      assigned,
      in_delivery: inDelivery,
      preparing,
      orders: enriched,
      drivers: driversEnriched,
    });
  } catch (error) {
    console.error('GET live-delivery:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

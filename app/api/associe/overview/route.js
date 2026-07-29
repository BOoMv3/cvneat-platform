import { NextResponse } from 'next/server';
import { requireAssocieOrAdmin } from '../../../../lib/require-associe-access';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireAssocieOrAdmin(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const sb = auth.supabaseAdmin;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const sinceIso = since.toISOString();

    const [
      ordersToday,
      livreesToday,
      enCours,
      restaurants,
      transfersToday,
      deliveryTransfersToday,
    ] = await Promise.all([
      sb
        .from('commandes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sinceIso)
        .neq('statut', 'annulee'),
      sb
        .from('commandes')
        .select('id', { count: 'exact', head: true })
        .eq('statut', 'livree')
        .gte('updated_at', sinceIso),
      sb
        .from('commandes')
        .select('id, statut, created_at, restaurant_id, livreur_id, total')
        .in('statut', ['en_attente', 'en_preparation', 'pret_a_livrer', 'en_livraison'])
        .order('created_at', { ascending: false })
        .limit(40),
      sb
        .from('restaurants')
        .select('id, nom, is_open, status')
        .order('nom')
        .limit(100),
      sb
        .from('restaurant_transfers')
        .select('id, amount, restaurant_name, transfer_date')
        .gte('transfer_date', sinceIso.slice(0, 10))
        .eq('status', 'completed')
        .limit(20),
      sb
        .from('delivery_transfers')
        .select('id, amount, delivery_name, transfer_date')
        .gte('transfer_date', sinceIso.slice(0, 10))
        .eq('status', 'completed')
        .limit(20),
    ]);

    const openRestaurants = (restaurants.data || []).filter(
      (r) => r.is_open === true || r.status === 'open' || r.status === 'active'
    );

    // Enrichir commandes en cours avec noms
    const list = enCours.data || [];
    const restoIds = [...new Set(list.map((o) => o.restaurant_id).filter(Boolean))];
    const livreurIds = [...new Set(list.map((o) => o.livreur_id).filter(Boolean))];
    const [{ data: restos }, { data: livreurs }] = await Promise.all([
      restoIds.length
        ? sb.from('restaurants').select('id, nom').in('id', restoIds)
        : Promise.resolve({ data: [] }),
      livreurIds.length
        ? sb.from('users').select('id, prenom, nom, email').in('id', livreurIds)
        : Promise.resolve({ data: [] }),
    ]);
    const restoMap = new Map((restos || []).map((r) => [r.id, r.nom]));
    const livMap = new Map(
      (livreurs || []).map((u) => [
        u.id,
        `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email || 'Livreur',
      ])
    );

    const liveOrders = list.map((o) => ({
      id: o.id,
      statut: o.statut,
      created_at: o.created_at,
      total: o.total,
      restaurant: restoMap.get(o.restaurant_id) || '—',
      livreur: o.livreur_id ? livMap.get(o.livreur_id) || '—' : 'Non assigné',
    }));

    return NextResponse.json({
      readOnly: auth.readOnly,
      role: auth.role,
      profile: {
        prenom: auth.profile?.prenom,
        nom: auth.profile?.nom,
        email: auth.profile?.email,
      },
      stats: {
        orders_today: ordersToday.count || 0,
        delivered_today: livreesToday.count || 0,
        live_count: liveOrders.length,
        restaurants_open: openRestaurants.length,
        restaurants_total: (restaurants.data || []).length,
      },
      live_orders: liveOrders,
      restaurants_open: openRestaurants.map((r) => ({ id: r.id, nom: r.nom })),
      restaurant_transfers_today: transfersToday.data || [],
      delivery_transfers_today: deliveryTransfersToday.data || [],
    });
  } catch (e) {
    console.error('associe overview:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { sanitizeOrderAmountsForLivreur } from '../../../../lib/livreur-delivery-earnings';

async function enrichOrders(orders, supabaseAdmin) {
  return Promise.all(
    (orders || []).map(async (order) => {
      try {
        let deliveryAddress = null;
        if (order.adresse_livraison) {
          deliveryAddress = {
            address: order.adresse_livraison,
            city: order.ville_livraison || null,
            postal_code:
              order.code_postal_livraison ||
              order.adresse_livraison.match(/\b(\d{5})\b/)?.[1] ||
              null,
            instructions:
              order.instructions_livraison ||
              order.adresse_livraison.match(/\(Instructions:\s*(.+?)\)/)?.[1]?.trim() ||
              null,
          };
        } else if (order.user_id) {
          const { data: address } = await supabaseAdmin
            .from('user_addresses')
            .select('id, address, city, postal_code, instructions')
            .eq('user_id', order.user_id)
            .maybeSingle();
          deliveryAddress = address || null;
        }

        let userProfile = order.users || null;
        if (!userProfile && order.user_id) {
          const { data: fetchedUser } = await supabaseAdmin
            .from('users')
            .select('nom, prenom, telephone, email')
            .eq('id', order.user_id)
            .maybeSingle();
          userProfile = fetchedUser || null;
        }

        const customerFirstName = order.customer_first_name || userProfile?.prenom || '';
        const customerLastName = order.customer_last_name || userProfile?.nom || '';
        const prepaySearch =
          order.driver_search_status === 'searching' &&
          !['paid', 'succeeded'].includes(String(order.payment_status || '').toLowerCase());

        return sanitizeOrderAmountsForLivreur({
          ...order,
          prepay_search: prepaySearch,
          user_addresses: deliveryAddress,
          adresse_livraison: order.adresse_livraison || deliveryAddress?.address || null,
          ville_livraison: order.ville_livraison || deliveryAddress?.city || null,
          code_postal_livraison:
            order.code_postal_livraison || deliveryAddress?.postal_code || null,
          instructions_livraison:
            order.instructions_livraison || deliveryAddress?.instructions || null,
          customer_name:
            [customerFirstName, customerLastName].filter(Boolean).join(' ').trim() ||
            customerLastName ||
            'Client',
          customer_first_name: customerFirstName || null,
          customer_last_name: customerLastName || null,
          customer_phone: order.customer_phone || userProfile?.telephone || null,
          customer_email: order.customer_email || userProfile?.email || null,
          delivery_address: order.adresse_livraison || deliveryAddress?.address || null,
          delivery_city: order.ville_livraison || deliveryAddress?.city || null,
          delivery_postal_code:
            order.code_postal_livraison || deliveryAddress?.postal_code || null,
          delivery_instructions:
            order.instructions_livraison || deliveryAddress?.instructions || null,
        });
      } catch (err) {
        console.warn('⚠️ Erreur enrichissement commande', order.id, err);
        return sanitizeOrderAmountsForLivreur(order);
      }
    })
  );
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token =
      authHeader?.replace('Bearer ', '') ||
      request.cookies.get('sb-access-token')?.value ||
      request.cookies.get('supabase-auth-token')?.value;

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (userData?.role || '').toString().trim().toLowerCase();
    if (userError || !userData || (role !== 'delivery' && role !== 'livreur')) {
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    const nowIso = new Date().toISOString();
    const selectClause = `*, restaurant:restaurants(nom, adresse, telephone, frais_livraison), users(id, nom, prenom, telephone, email)`;

    // 1) Payées sans livreur (legacy / edge) + 2) En recherche avant paiement
    const [paidRes, searchRes] = await Promise.all([
      supabaseAdmin
        .from('commandes')
        .select(selectClause)
        .eq('statut', 'en_attente')
        .is('livreur_id', null)
        .neq('order_fulfillment', 'pickup')
        .in('payment_status', ['paid', 'succeeded'])
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('commandes')
        .select(selectClause)
        .eq('statut', 'en_attente')
        .is('livreur_id', null)
        .neq('order_fulfillment', 'pickup')
        .eq('driver_search_status', 'searching')
        .gte('driver_search_expires_at', nowIso)
        .order('created_at', { ascending: true }),
    ]);

    if (paidRes.error && searchRes.error) {
      console.error('❌ available-orders:', paidRes.error, searchRes.error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const merged = [...(paidRes.data || []), ...(searchRes.data || [])];
    const seen = new Set();
    const orders = merged.filter((o) => {
      if (!o?.id || seen.has(o.id)) return false;
      seen.add(o.id);
      // Filet de sécurité : jamais de retrait sur place chez les livreurs
      if (String(o.order_fulfillment || 'delivery').toLowerCase() === 'pickup') return false;
      // Recherche: uniquement unpaid
      if (o.driver_search_status === 'searching') {
        const ps = String(o.payment_status || '').toLowerCase();
        if (['paid', 'succeeded'].includes(ps)) return false;
      }
      return true;
    });

    const enriched = await enrichOrders(orders, supabaseAdmin);
    return NextResponse.json(enriched);
  } catch (error) {
    console.error('❌ Erreur API commandes disponibles:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Récupérer le token d'authentification
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || null;

    if (!token) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    // Créer un client Supabase avec le token de l'utilisateur
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Vérifier l'utilisateur
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Créer aussi un client admin pour bypasser RLS si nécessaire
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // D'abord essayer avec le client utilisateur (respecte RLS)
    let { data: order, error } = await supabase
      .from('commandes')
      .select(`
        *,
        details_commande (
          id,
          quantite,
          prix_unitaire,
          menus (
            nom,
            prix
          )
        ),
        restaurants (
          id,
          nom,
          adresse,
          ville,
          code_postal
        )
      `)
      .eq('id', id)
      .single();

    // Si erreur RLS ou pas de résultat, essayer avec admin pour vérifier l'existence
    if (error || !order) {
      const { data: orderAdmin, error: adminError } = await supabaseAdmin
        .from('commandes')
        .select('id, user_id, restaurant_id')
        .eq('id', id)
        .single();

      if (adminError || !orderAdmin) {
        return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
      }

      // Vérifier que la commande appartient à l'utilisateur
      if (orderAdmin.user_id !== user.id) {
        return NextResponse.json({ error: 'Vous n\'êtes pas autorisé à voir cette commande' }, { status: 403 });
      }

      // Si la commande existe et appartient à l'utilisateur, récupérer avec admin
      const { data: orderFull, error: orderError } = await supabaseAdmin
        .from('commandes')
        .select(`
          *,
          details_commande (
            id,
            quantite,
            prix_unitaire,
            menus (
              nom,
              prix
            )
          ),
          restaurants (
            id,
            nom,
            adresse,
            ville,
            code_postal
          )
        `)
        .eq('id', id)
        .single();

      if (orderError || !orderFull) {
        return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 });
      }

      order = orderFull;
    }

    // Formater les données pour le frontend
    const restaurant = order.restaurants;
    const items = (order.details_commande || []).map(detail => ({
      id: detail.id,
      name: detail.menus?.nom || 'Article',
      quantity: detail.quantite || 0,
      price: parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0
    }));

    // Extraire l'adresse de livraison
    const addressParts = (order.adresse_livraison || '').split(',').map(s => s.trim());
    const deliveryAddress = addressParts[0] || '';
    const deliveryCity = addressParts.length > 2 ? addressParts[1] : (addressParts[1] || '');
    const deliveryPostalCode = addressParts.length > 2 ? addressParts[2]?.split(' ')[0] : '';
    const deliveryPhone = order.telephone || order.phone || '';

    const formattedOrder = {
      id: order.id,
      status: order.statut || order.status,
      createdAt: order.created_at,
      restaurant: {
        id: restaurant?.id,
        name: restaurant?.nom || 'Restaurant inconnu',
        address: restaurant?.adresse || '',
        city: restaurant?.ville || ''
      },
      deliveryAddress: deliveryAddress,
      deliveryCity: deliveryCity,
      deliveryPostalCode: deliveryPostalCode,
      deliveryPhone: deliveryPhone,
      total: parseFloat(order.total || 0) || 0,
      deliveryFee: parseFloat(order.frais_livraison || 0) || 0,
      items: items,
      details_commande: order.details_commande || []
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    // Mettre à jour la commande
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('commandes')
      .update({
        statut: body.statut || body.status, // Accepter les deux pour compatibilité
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
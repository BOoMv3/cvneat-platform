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
          supplements,
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
      console.log('Erreur avec client utilisateur, tentative avec admin. Erreur:', error);
      
      // Vérifier que la clé admin est disponible
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('SUPABASE_SERVICE_ROLE_KEY non définie');
        return NextResponse.json({ 
          error: 'Erreur de configuration serveur' 
        }, { status: 500 });
      }

      const { data: orderAdmin, error: adminError } = await supabaseAdmin
        .from('commandes')
        .select('id, user_id, restaurant_id')
        .eq('id', id)
        .single();

      if (adminError || !orderAdmin) {
        console.log('Commande non trouvée avec admin:', adminError);
        return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
      }

      // Vérifier que la commande appartient à l'utilisateur
      if (orderAdmin.user_id !== user.id) {
        console.log('Commande appartient à un autre utilisateur');
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
            supplements,
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

      if (orderError) {
        console.error('Erreur récupération complète avec admin:', orderError);
        return NextResponse.json({ 
          error: 'Erreur lors de la récupération des détails de la commande',
          details: process.env.NODE_ENV === 'development' ? orderError.message : undefined
        }, { status: 500 });
      }

      if (!orderFull) {
        console.error('Aucune donnée retournée par admin pour la commande:', id);
        return NextResponse.json({ 
          error: 'Commande non trouvée' 
        }, { status: 404 });
      }

      order = orderFull;
    }

    // Formater les données pour le frontend
    const restaurant = order.restaurants;
    
    // Récupérer les informations client depuis la table users si elle existe
    let customerName = 'Client';
    let customerPhone = '';
    
    try {
      // Essayer de récupérer depuis la table users publique
      const { data: customerData } = await supabaseAdmin
        .from('users')
        .select('prenom, nom, telephone, email')
        .eq('id', order.user_id)
        .single();
      
      if (customerData) {
        customerName = customerData.prenom && customerData.nom 
          ? `${customerData.prenom} ${customerData.nom}` 
          : customerData.email || 'Client';
        customerPhone = customerData.telephone || '';
      } else {
        // Fallback : utiliser l'email depuis auth.users si disponible
        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
        if (authUser && authUser.email) {
          customerName = authUser.email;
        }
      }
    } catch (customerError) {
      console.warn('⚠️ Impossible de récupérer les infos client:', customerError);
      // Continuer avec les valeurs par défaut
    }
    
    const items = (order.details_commande || []).map(detail => {
      // Récupérer les suppléments depuis le détail
      let supplements = [];
      if (detail.supplements) {
        if (typeof detail.supplements === 'string') {
          try {
            supplements = JSON.parse(detail.supplements);
          } catch (e) {
            supplements = [];
          }
        } else if (Array.isArray(detail.supplements)) {
          supplements = detail.supplements;
        }
      }
      
      return {
        id: detail.id,
        name: detail.menus?.nom || 'Article',
        quantity: detail.quantite || 0,
        price: parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0,
        supplements: supplements
      };
    });

    // Extraire l'adresse de livraison
    const addressParts = (order.adresse_livraison || '').split(',').map(s => s.trim());
    const deliveryAddress = addressParts[0] || '';
    const deliveryCity = addressParts.length > 2 ? addressParts[1] : (addressParts[1] || '');
    const deliveryPostalCode = addressParts.length > 2 ? addressParts[2]?.split(' ')[0] : '';
    const deliveryPhone = order.telephone || order.phone || '';

    const formattedOrder = {
      id: order.id,
      status: order.statut || order.status,
      statut: order.statut || order.status, // Ajouter aussi pour compatibilité
      createdAt: order.created_at,
      created_at: order.created_at || new Date().toISOString(), // Fallback si manquant
      updated_at: order.updated_at || new Date().toISOString(), // Fallback si manquant
      user_id: order.user_id, // Ajouter aussi pour compatibilité
      security_code: order.security_code, // Code de sécurité pour la livraison
      frais_livraison: parseFloat(order.frais_livraison || 0) || 0, // Ajouter aussi pour compatibilité
      adresse_livraison: order.adresse_livraison, // Ajouter aussi pour compatibilité
      preparation_time: order.preparation_time, // Ajouter aussi pour compatibilité
      livreur_id: order.livreur_id, // Ajouter aussi pour compatibilité
      customer_name: customerName, // Nom complet du client
      customer_phone: customerPhone, // Téléphone du client
      restaurant: {
        id: restaurant?.id,
        name: restaurant?.nom || 'Restaurant inconnu',
        address: restaurant?.adresse || '',
        city: restaurant?.ville || ''
      },
      deliveryAddress: deliveryAddress,
      deliveryCity: deliveryCity,
      deliveryPostalCode: deliveryPostalCode,
      deliveryPhone: deliveryPhone || customerPhone, // Fallback sur téléphone client
      total: parseFloat(order.total || 0) || 0,
      deliveryFee: parseFloat(order.frais_livraison || 0) || 0,
      items: items,
      details_commande: (order.details_commande || []).map(detail => {
        // S'assurer que les suppléments sont inclus dans details_commande
        let supplements = [];
        if (detail.supplements) {
          if (typeof detail.supplements === 'string') {
            try {
              supplements = JSON.parse(detail.supplements);
            } catch (e) {
              supplements = [];
            }
          } else if (Array.isArray(detail.supplements)) {
            supplements = detail.supplements;
          }
        }
        return {
          ...detail,
          supplements: supplements
        };
      })
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error('Erreur générale dans GET /api/orders/[id]:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
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
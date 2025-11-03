import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    console.log('=== RÉCUPÉRATION COMMANDE PAR ID ===');
    console.log('ID demandé:', id);

    // Récupérer le token d'authentification
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || null;

    if (!token) {
      console.error('❌ Token manquant');
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
      console.error('❌ Erreur authentification:', userError);
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    console.log('✅ Utilisateur authentifié:', user.email);

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
        )
      `)
      .eq('id', id)
      .single();

    // Si erreur RLS ou pas de résultat, essayer avec admin pour vérifier l'existence
    if (error || !order) {
      console.log('⚠️ Erreur avec client utilisateur, tentative avec admin pour vérifier existence:', error?.message);
      
      const { data: orderAdmin, error: adminError } = await supabaseAdmin
        .from('commandes')
        .select('id, user_id, restaurant_id')
        .eq('id', id)
        .single();

      if (adminError || !orderAdmin) {
        console.error('❌ Commande non trouvée dans la base:', adminError);
        return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
      }

      // Vérifier que la commande appartient à l'utilisateur
      if (orderAdmin.user_id !== user.id) {
        console.error('❌ Commande n\'appartient pas à l\'utilisateur:', {
          commande_user_id: orderAdmin.user_id,
          current_user_id: user.id
        });
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
          )
        `)
        .eq('id', id)
        .single();

      if (orderError || !orderFull) {
        console.error('❌ Erreur récupération complète:', orderError);
        return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 });
      }

      order = orderFull;
    }

    console.log('✅ Commande trouvée:', order.id);
    return NextResponse.json(order);
  } catch (error) {
    console.error('❌ Erreur API commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    console.log('=== MISE À JOUR COMMANDE ===');
    console.log('ID commande:', id);
    console.log('Données reçues:', body);

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
      console.error('❌ Erreur mise à jour:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    console.log('✅ Commande mise à jour:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Erreur API mise à jour:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
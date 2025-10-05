import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// GET /api/restaurants/[id]/orders - Récupérer les commandes d'un restaurant
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filtrer par statut (pending, accepted, etc.)

    console.log('=== RÉCUPÉRATION COMMANDES RESTAURANT ===');
    console.log('Restaurant ID demandé:', id);
    console.log('Type du restaurant ID:', typeof id);
    console.log('Statut filtré:', status);
    
    // Vérifier que l'ID est valide
    if (!id) {
      console.error('❌ Restaurant ID manquant');
      return NextResponse.json(
        { error: 'Restaurant ID requis' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('commandes')
      .select('*')
      .eq('restaurant_id', id)
      .order('created_at', { ascending: false });

    // Filtrer par statut si spécifié
    if (status) {
      query = query.eq('statut', status);
    }

    const { data: orders, error } = await query;

    console.log('Résultat de la requête:');
    console.log('- Erreur:', error);
    console.log('- Nombre de commandes trouvées:', orders?.length || 0);
    console.log('- Commandes:', orders);

    if (error) {
      console.error('❌ Erreur lors de la récupération des commandes:', error);
      console.error('❌ Détails erreur:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: 'Erreur lors de la récupération des commandes',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    // Récupérer les données utilisateur pour chaque commande
    const ordersWithUsers = [];
    for (const order of orders || []) {
      if (order.user_id) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('nom, email, telephone')
            .eq('id', order.user_id)
            .single();
          
          ordersWithUsers.push({
            ...order,
            user: userData || null
          });
        } catch (userError) {
          console.warn('Erreur récupération utilisateur:', userError);
          ordersWithUsers.push({
            ...order,
            user: null
          });
        }
      } else {
        ordersWithUsers.push({
          ...order,
          user: null
        });
      }
    }

    return NextResponse.json(ordersWithUsers);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    );
  }
} 
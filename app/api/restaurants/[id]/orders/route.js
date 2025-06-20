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

    let query = supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', id)
      .order('created_at', { ascending: false });

    // Filtrer par statut si spécifié
    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    console.log('Résultat de la requête:');
    console.log('- Erreur:', error);
    console.log('- Nombre de commandes trouvées:', orders?.length || 0);
    console.log('- Commandes:', orders);

    if (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des commandes' },
        { status: 500 }
      );
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const status = searchParams.get('status');

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID requis' }, { status: 400 });
    }

    let query = supabase
      .from('commandes')
      .select(`
        *,
        users(nom, prenom, email, telephone),
        commande_details(
          quantite,
          prix_unitaire,
          menus(id, nom, description, image_url)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('statut', status);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    return NextResponse.json(orders || []);
  } catch (error) {
    console.error('Erreur récupération commandes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Order ID et status requis' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('commandes')
      .update({ statut: status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur mise à jour commande:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la commande' },
      { status: 500 }
    );
  }
} 
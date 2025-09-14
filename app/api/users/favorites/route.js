import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID requis' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .select(`
        restaurant_id,
        restaurants (
          id,
          nom,
          description,
          image_url,
          rating,
          delivery_time,
          frais_livraison,
          adresse,
          ville
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Erreur lors de la récupération des favoris:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des favoris' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Erreur API favoris:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId, restaurantId } = await request.json();

    if (!userId || !restaurantId) {
      return NextResponse.json({ error: 'User ID et Restaurant ID requis' }, { status: 400 });
    }

    // Vérifier si le favori existe déjà
    const { data: existing } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Restaurant déjà en favori' }, { status: 200 });
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .insert([{
        user_id: userId,
        restaurant_id: restaurantId
      }])
      .select();

    if (error) {
      console.error('Erreur lors de l\'ajout aux favoris:', error);
      return NextResponse.json({ error: 'Erreur lors de l\'ajout aux favoris' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Ajouté aux favoris', data }, { status: 201 });
  } catch (error) {
    console.error('Erreur API favoris POST:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const restaurantId = searchParams.get('restaurantId');

    if (!userId || !restaurantId) {
      return NextResponse.json({ error: 'User ID et Restaurant ID requis' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);

    if (error) {
      console.error('Erreur lors de la suppression des favoris:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression des favoris' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Supprimé des favoris' }, { status: 200 });
  } catch (error) {
    console.error('Erreur API favoris DELETE:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID requis' }, { status: 400 });
    }

    const { data: menu, error } = await supabase
      .from('menus')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(menu || []);
  } catch (error) {
    console.error('Erreur récupération menu:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du menu' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { restaurantId, nom, description, prix, image_url, disponible, category } = await request.json();

    if (!restaurantId || !nom || !prix) {
      return NextResponse.json({ error: 'Restaurant ID, nom et prix requis' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('menus')
      .insert({
        restaurant_id: restaurantId,
        nom,
        description,
        prix: parseFloat(prix),
        image_url,
        disponible: disponible !== undefined ? disponible : true,
        category
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur création menu:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du menu' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { id, nom, description, prix, image_url, disponible, category } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Menu ID requis' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('menus')
      .update({
        nom,
        description,
        prix: parseFloat(prix),
        image_url,
        disponible,
        category
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur mise à jour menu:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du menu' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get('id');

    if (!menuId) {
      return NextResponse.json({ error: 'Menu ID requis' }, { status: 400 });
    }

    const { error } = await supabase
      .from('menus')
      .delete()
      .eq('id', menuId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression menu:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du menu' },
      { status: 500 }
    );
  }
} 
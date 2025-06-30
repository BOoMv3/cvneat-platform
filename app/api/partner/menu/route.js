import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'ID du restaurant requis' },
        { status: 400 }
      );
    }

    const { data: menu, error } = await supabase
      .from('menus')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('nom', { ascending: true });

    if (error) {
      console.error('Erreur récupération menu:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération du menu' },
        { status: 500 }
      );
    }

    return NextResponse.json(menu || []);
  } catch (error) {
    console.error('Erreur API récupération menu:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const {
      restaurant_id,
      nom,
      description,
      prix,
      category = 'Autres'
    } = await request.json();

    if (!restaurant_id || !nom || !prix) {
      return NextResponse.json(
        { error: 'ID restaurant, nom et prix sont requis' },
        { status: 400 }
      );
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, partner_id')
      .eq('id', restaurant_id)
      .eq('is_active', true)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant non trouvé ou inactif' },
        { status: 404 }
      );
    }

    const { data: menuItem, error: menuError } = await supabase
      .from('menus')
      .insert([
        {
          restaurant_id,
          nom,
          description,
          prix: parseFloat(prix),
          category,
          is_available: true
        }
      ])
      .select()
      .single();

    if (menuError) {
      console.error('Erreur création menu:', menuError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'item de menu' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      menuItem,
      message: 'Item de menu créé avec succès'
    });
  } catch (error) {
    console.error('Erreur API création menu:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
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
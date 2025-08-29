import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const imageUrl = formData.get('imageUrl');
    const menuItemId = formData.get('menuItemId');
    const userEmail = formData.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ error: 'Email utilisateur requis' }, { status: 401 });
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL d\'image requise' }, { status: 400 });
    }

    // Vérifier que l'utilisateur a le rôle restaurant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', userEmail)
      .single();

    if (userError || !userData || userData.role !== 'restaurant') {
      return NextResponse.json({ error: 'Accès refusé - Rôle restaurant requis' }, { status: 403 });
    }

    // Mettre à jour l'item de menu avec la nouvelle URL d'image
    const { error: updateError } = await supabase
      .from('menus')
      .update({ image_url: imageUrl })
      .eq('id', menuItemId);

    if (updateError) {
      console.error('Erreur mise à jour menu:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du menu' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      message: 'Image mise à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur API upload image menu:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image');
    const imageUrl = formData.get('imageUrl');
    const menuItemId = formData.get('menuItemId');
    const userEmail = formData.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ error: 'Email utilisateur requis' }, { status: 401 });
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

    let finalImageUrl = '';

    if (imageFile && imageFile.size > 0) {
      // Upload de fichier depuis PC
      const fileName = `menu-${Date.now()}-${imageFile.name}`;
      
      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(fileName, imageFile);

      if (uploadError) {
        console.error('Erreur upload fichier:', uploadError);
        return NextResponse.json({ error: 'Erreur lors de l\'upload du fichier' }, { status: 500 });
      }

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName);

      finalImageUrl = publicUrl;
    } else if (imageUrl) {
      // URL directe fournie
      finalImageUrl = imageUrl;
    } else {
      return NextResponse.json({ error: 'Fichier ou URL d\'image requis' }, { status: 400 });
    }

    // Mettre à jour l'item de menu avec la nouvelle image
    const { error: updateError } = await supabase
      .from('menus')
      .update({ image_url: finalImageUrl })
      .eq('id', menuItemId);

    if (updateError) {
      console.error('Erreur mise à jour menu:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du menu' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imageUrl: finalImageUrl,
      message: 'Image mise à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur API upload image menu:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
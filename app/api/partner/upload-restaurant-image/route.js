import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un partenaire
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.role.includes('restaurant')) {
      return NextResponse.json({ error: 'Accès refusé - Rôle partenaire requis' }, { status: 403 });
    }

    const formData = await request.formData();
    const image = formData.get('image');
    const restaurantId = formData.get('restaurantId');
    const imageType = formData.get('imageType'); // 'profile' ou 'banner'

    if (!image || !restaurantId || !imageType) {
      return NextResponse.json({ error: 'Image, restaurantId et imageType requis' }, { status: 400 });
    }

    // Vérifier que l'image appartient au bon restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé ou non autorisé' }, { status: 404 });
    }

    // Convertir l'image en buffer
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Générer un nom unique pour l'image
    const timestamp = Date.now();
    const fileName = `restaurant-${restaurantId}-${imageType}-${timestamp}-${image.name}`;

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('restaurant-images')
      .upload(fileName, buffer, {
        contentType: image.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erreur upload image restaurant:', uploadError);
      return NextResponse.json({ error: 'Erreur lors de l\'upload de l\'image' }, { status: 500 });
    }

    // Générer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(fileName);

    // Mettre à jour le restaurant avec la nouvelle image
    const updateField = imageType === 'profile' ? 'profile_image' : 'banner_image';
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ [updateField]: publicUrl })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('Erreur mise à jour restaurant:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du restaurant' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Image uploadée avec succès',
      imageUrl: publicUrl,
      fileName: fileName
    });

  } catch (error) {
    console.error('Erreur API upload image restaurant:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
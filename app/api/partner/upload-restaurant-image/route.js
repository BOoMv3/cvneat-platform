import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    // Récupérer l'email depuis les données de la requête
    const formData = await request.formData();
    const userEmail = formData.get('userEmail');
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Email utilisateur requis' }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe et a le bon rôle
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', userEmail)
      .single();

    if (userError || !userData || userData.role !== 'restaurant') {
      return NextResponse.json({ error: 'Accès refusé - Rôle restaurant requis' }, { status: 403 });
    }

    // Récupérer les données du formulaire
    const imageUrl = formData.get('imageUrl'); // Maintenant c'est une URL
    const restaurantId = formData.get('restaurantId');
    const imageType = formData.get('imageType'); // 'profile' ou 'banner'

    if (!imageUrl || !restaurantId || !imageType) {
      return NextResponse.json({ error: 'URL image, restaurantId et imageType requis' }, { status: 400 });
    }

    // Vérifier que l'utilisateur est propriétaire du restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('user_id', userData.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé ou non autorisé' }, { status: 404 });
    }

    // Mettre à jour le restaurant avec la nouvelle URL d'image
    const updateField = imageType === 'profile' ? 'profile_image' : 'banner_image';
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ [updateField]: imageUrl })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('Erreur mise à jour restaurant:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du restaurant' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Image mise à jour avec succès',
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('Erreur API mise à jour image restaurant:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
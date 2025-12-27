import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// PUT /api/partner/restaurant/[id] - Mettre à jour un restaurant
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un restaurant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'restaurant') {
      return NextResponse.json({ error: 'Accès refusé - Rôle restaurant requis' }, { status: 403 });
    }

    // Vérifier que le restaurant appartient à l'utilisateur
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    if (restaurant.user_id !== user.id) {
      return NextResponse.json({ error: 'Vous n\'êtes pas autorisé à modifier ce restaurant' }, { status: 403 });
    }

    // Préparer les données à mettre à jour
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    // Toujours inclure ferme_manuellement si fourni (même si false)
    if (body.ferme_manuellement !== undefined) {
      // S'assurer que c'est un booléen strict
      updateData.ferme_manuellement = body.ferme_manuellement === true || body.ferme_manuellement === 'true' || body.ferme_manuellement === 1;
    }

    console.log('📝 Mise à jour restaurant:', {
      restaurant_id: id,
      updateData,
      ferme_manuellement_value: body.ferme_manuellement,
      ferme_manuellement_type: typeof body.ferme_manuellement
    });

    // Mettre à jour le restaurant
    const { data: updatedRestaurant, error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update(updateData)
      .eq('id', id)
      .select('id, nom, ferme_manuellement, updated_at')
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour restaurant:', updateError);
      return NextResponse.json({ 
        error: 'Erreur lors de la mise à jour', 
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ Restaurant mis à jour:', {
      id: updatedRestaurant.id,
      nom: updatedRestaurant.nom,
      ferme_manuellement: updatedRestaurant.ferme_manuellement
    });

    return NextResponse.json({
      success: true,
      restaurant: updatedRestaurant,
      message: 'Restaurant mis à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur API mise à jour restaurant:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


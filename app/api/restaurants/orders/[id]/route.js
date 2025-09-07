import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, reason, preparation_time } = body;
    
    console.log('=== MISE À JOUR COMMANDE RESTAURANT ===');
    console.log('ID commande:', id);
    console.log('Données reçues:', body);

    // Récupérer le token d'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Pas de token d\'authentification');
      return NextResponse.json({ error: 'Token d\'authentification requis' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Token reçu:', token ? 'Oui' : 'Non');

    // Vérifier l'authentification
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('❌ Erreur authentification:', userError);
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    console.log('✅ Utilisateur authentifié:', user.email);

    // Vérifier que l'utilisateur est un restaurant
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || userData.role !== 'restaurant') {
      console.error('❌ Utilisateur pas restaurant:', userData);
      return NextResponse.json({ error: 'Accès non autorisé - Restaurant requis' }, { status: 403 });
    }

    console.log('✅ Rôle restaurant confirmé');

    // Vérifier que la commande existe
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      console.error('❌ Commande non trouvée:', orderError);
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    console.log('✅ Commande trouvée:', order.id);

    // Vérifier que la commande appartient à ce restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      console.error('❌ Restaurant non trouvé pour cet utilisateur:', restaurantError);
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    if (order.restaurant_id !== restaurant.id) {
      console.error('❌ Commande ne appartient pas à ce restaurant:', {
        commande_restaurant: order.restaurant_id,
        restaurant_utilisateur: restaurant.id
      });
      return NextResponse.json({ error: 'Cette commande ne vous appartient pas' }, { status: 403 });
    }

    console.log('✅ Commande appartient au restaurant');

    // Mettre à jour la commande
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (reason) {
      updateData.rejection_reason = reason;
    }

    if (preparation_time !== null && preparation_time !== undefined) {
      updateData.preparation_time = preparation_time;
    }

    console.log('📤 Données de mise à jour:', updateData);

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour commande:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour de la commande' }, { status: 500 });
    }

    console.log('✅ Commande mise à jour avec succès:', updatedOrder.id);
    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Commande mise à jour avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur API restaurant commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

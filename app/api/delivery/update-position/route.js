import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST - Mettre à jour la position GPS du livreur pour sa commande en cours
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    // Vérifier l'utilisateur avec le token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Erreur auth:', authError);
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un livreur
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      return NextResponse.json({ error: 'Accès refusé - Rôle invalide' }, { status: 403 });
    }

    // Récupérer la position GPS
    const { latitude, longitude, orderId } = await request.json();

    console.log('📍 Mise à jour position livreur:', {
      userId: user.id,
      orderId,
      latitude,
      longitude
    });

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Latitude et longitude requises' }, { status: 400 });
    }

    // Validation des coordonnées
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Coordonnées GPS invalides' }, { status: 400 });
    }

    let updateResult;

    if (orderId) {
      // Mettre à jour une commande spécifique
      const { data, error } = await supabaseAdmin
        .from('commandes')
        .update({
          livreur_latitude: latitude,
          livreur_longitude: longitude,
          livreur_position_updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('livreur_id', user.id)
        .eq('statut', 'en_livraison')
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur mise à jour position (commande spécifique):', error);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour de la position' }, { status: 500 });
      }

      updateResult = data;
    } else {
      // Mettre à jour toutes les commandes en livraison du livreur
      const { data, error } = await supabaseAdmin
        .from('commandes')
        .update({
          livreur_latitude: latitude,
          livreur_longitude: longitude,
          livreur_position_updated_at: new Date().toISOString()
        })
        .eq('livreur_id', user.id)
        .eq('statut', 'en_livraison')
        .select();

      if (error) {
        console.error('❌ Erreur mise à jour position (toutes commandes):', error);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour de la position' }, { status: 500 });
      }

      updateResult = data;
    }

    console.log('✅ Position mise à jour:', updateResult);

    return NextResponse.json({ 
      success: true, 
      message: 'Position mise à jour avec succès',
      updated: updateResult
    });

  } catch (error) {
    console.error('❌ Erreur API update-position:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


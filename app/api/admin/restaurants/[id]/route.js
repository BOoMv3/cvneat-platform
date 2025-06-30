import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// GET /api/admin/restaurants/[id] - Récupérer un restaurant spécifique
export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        menus(*),
        orders(count),
        partner:users(email, full_name, telephone)
      `)
      .eq('id', params.id)
      .single();

    if (error) throw error;

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error('Erreur récupération restaurant:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/admin/restaurants/[id] - Mettre à jour un restaurant
export async function PUT(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const {
      nom,
      adresse,
      telephone,
      email,
      description,
      horaires,
      is_active,
      commission_rate
    } = await request.json();

    const updateData = {};
    if (nom !== undefined) updateData.nom = nom;
    if (adresse !== undefined) updateData.adresse = adresse;
    if (telephone !== undefined) updateData.telephone = telephone;
    if (email !== undefined) updateData.email = email;
    if (description !== undefined) updateData.description = description;
    if (horaires !== undefined) updateData.horaires = horaires;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (commission_rate !== undefined) updateData.commission_rate = commission_rate;

    const { data: updatedRestaurant, error } = await supabase
      .from('restaurants')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        partner:users(email, full_name)
      `)
      .single();

    if (error) throw error;

    // Envoyer email de notification au partenaire si le statut change
    if (is_active !== undefined && is_active !== updatedRestaurant.is_active) {
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: is_active ? 'restaurantActivated' : 'restaurantDeactivated',
            data: {
              restaurantName: updatedRestaurant.nom,
              partnerName: updatedRestaurant.partner?.full_name,
              reason: is_active ? 'Votre restaurant a été activé' : 'Votre restaurant a été désactivé'
            },
            recipientEmail: updatedRestaurant.partner?.email
          })
        });
      } catch (emailError) {
        console.error('Erreur envoi email notification restaurant:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      restaurant: updatedRestaurant
    });
  } catch (error) {
    console.error('Erreur mise à jour restaurant:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/admin/restaurants/[id] - Désactiver un restaurant
export async function DELETE(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Récupérer les infos du restaurant avant désactivation
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select(`
        *,
        partner:users(email, full_name)
      `)
      .eq('id', params.id)
      .single();

    if (restaurantError) throw restaurantError;

    // Désactiver le restaurant
    const { data: deactivatedRestaurant, error } = await supabase
      .from('restaurants')
      .update({ is_active: false })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Envoyer email de notification au partenaire
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'restaurantDeactivated',
          data: {
            restaurantName: restaurant.nom,
            partnerName: restaurant.partner?.full_name,
            reason: 'Votre restaurant a été désactivé par l\'administration'
          },
          recipientEmail: restaurant.partner?.email
        })
      });
    } catch (emailError) {
      console.error('Erreur envoi email désactivation:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Restaurant désactivé',
      restaurant: deactivatedRestaurant
    });
  } catch (error) {
    console.error('Erreur désactivation restaurant:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
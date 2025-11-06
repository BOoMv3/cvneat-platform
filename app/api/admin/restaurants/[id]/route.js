import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin as sharedSupabaseAdmin } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

const getAdminClient = () => {
  if (sharedSupabaseAdmin) {
    return sharedSupabaseAdmin;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !url) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

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

// DELETE /api/admin/restaurants/[id] - Supprimer définitivement un restaurant
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

    // Utiliser un client admin pour contourner les RLS
    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error: 'Configuration Supabase incomplète',
          details: 'SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL manquant. Veuillez vérifier votre fichier .env.local.'
        },
        { status: 500 }
      );
    }

    // Récupérer les infos du restaurant avant suppression
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select(`
        *,
        partner:users(id, email, full_name)
      `)
      .eq('id', params.id)
      .single();

    if (restaurantError) {
      console.error('Erreur récupération restaurant (admin):', restaurantError);
      return NextResponse.json(
        {
          error: 'Impossible de récupérer le restaurant',
          details: restaurantError.message || 'Erreur inconnue lors de la récupération du restaurant'
        },
        { status: restaurantError.code === 'PGRST116' ? 404 : 500 }
      );
    }

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Vérifier s'il y a des commandes en cours
    const { data: activeOrders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select('id, statut')
      .eq('restaurant_id', params.id)
      .in('statut', ['en_attente', 'acceptee', 'en_preparation', 'prete']);

    if (ordersError) {
      console.error('Erreur vérification commandes:', ordersError);
    }

    if (activeOrders && activeOrders.length > 0) {
      return NextResponse.json({
        error: 'Impossible de supprimer le restaurant',
        details: `Il y a ${activeOrders.length} commande(s) en cours. Veuillez d'abord traiter ces commandes.`,
        code: 'ACTIVE_ORDERS'
      }, { status: 409 });
    }

    // Vérifier le nombre total de commandes (pour information)
    const { count: totalOrdersCount } = await supabaseAdmin
      .from('commandes')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', params.id);

    // Supprimer le restaurant (cascade devrait supprimer les menus, formules, etc.)
    // Si les contraintes de clés étrangères sont en ON DELETE CASCADE
    const { error: deleteError } = await supabaseAdmin
      .from('restaurants')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Erreur suppression restaurant:', deleteError);
      
      // Vérifier si c'est une erreur de contrainte de clé étrangère
      if (deleteError.code === '23503' || deleteError.message?.includes('foreign key')) {
        return NextResponse.json({
          error: 'Impossible de supprimer le restaurant',
          details: 'Le restaurant est lié à d\'autres données (commandes, menus, formules, etc.). Vous pouvez le désactiver au lieu de le supprimer.',
          code: 'FOREIGN_KEY_CONSTRAINT',
          suggestion: 'Utilisez PUT pour désactiver le restaurant (is_active: false)'
        }, { status: 409 });
      }

      return NextResponse.json({
        error: 'Erreur lors de la suppression du restaurant',
        details: deleteError.message || 'Erreur inconnue',
        code: deleteError.code
      }, { status: 500 });
    }

    // Envoyer email de notification au partenaire
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'restaurantDeleted',
          data: {
            restaurantName: restaurant.nom,
            partnerName: restaurant.partner?.full_name,
            reason: 'Votre restaurant a été supprimé définitivement par l\'administration'
          },
          recipientEmail: restaurant.partner?.email
        })
      });
    } catch (emailError) {
      console.error('Erreur envoi email suppression:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Restaurant supprimé définitivement',
      deletedRestaurant: {
        id: restaurant.id,
        nom: restaurant.nom,
        email: restaurant.email
      },
      stats: {
        totalOrders: totalOrdersCount || 0
      }
    });
  } catch (error) {
    console.error('Erreur suppression restaurant:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
} 
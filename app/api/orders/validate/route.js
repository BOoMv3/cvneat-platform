import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

function dbForRestaurantRead() {
  return supabaseAdmin ?? supabase;
}

// POST /api/orders/validate - Valider une commande avant paiement
export async function POST(request) {
  try {
    const { restaurantId, items, deliveryInfo } = await request.json();

    if (!restaurantId || !items || !deliveryInfo) {
      return NextResponse.json(
        { error: 'Données de commande incomplètes' },
        { status: 400 }
      );
    }

    // 1. Vérifier si le restaurant existe et est actif
    const { data: restaurant, error: restaurantError } = await dbForRestaurantRead()
      .from('restaurants')
      .select('id, nom, is_active, commande_min')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant non trouvé' },
        { status: 404 }
      );
    }

    if (!restaurant.is_active) {
      return NextResponse.json(
        { 
          error: 'Restaurant temporairement fermé',
          code: 'RESTAURANT_INACTIVE',
          message: 'Ce restaurant n\'accepte pas de commandes pour le moment'
        },
        { status: 400 }
      );
    }

    // 2. On ne bloque plus sur ferme_manuellement / horaires : le partenaire gère en cuisine ;
    //    seul is_active empêche les commandes (voir étape 1).

    // 3. Vérifier que tous les articles sont disponibles
    const menuItems = await Promise.all(
      items.map(async (item) => {
        const { data: menuItem, error } = await supabase
          .from('menus')
          .select('id, nom, prix, disponible, restaurant_id')
          .eq('id', item.id)
          .eq('restaurant_id', restaurantId)
          .single();

        if (error || !menuItem) {
          throw new Error(`Article non trouvé: ${item.name}`);
        }

        if (!menuItem.disponible) {
          throw new Error(`Article non disponible: ${menuItem.nom}`);
        }

        return menuItem;
      })
    );

    // 4. Vérifier la commande minimum
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (subtotal < (restaurant.commande_min || 0)) {
      return NextResponse.json(
        { 
          error: 'Commande minimum non atteinte',
          code: 'MINIMUM_ORDER',
          message: `Commande minimum: ${restaurant.commande_min}€`,
          currentAmount: subtotal,
          minimumRequired: restaurant.commande_min
        },
        { status: 400 }
      );
    }

    // 5. Vérifier la zone de livraison
    const deliveryZoneValid = await checkDeliveryZone(restaurantId, deliveryInfo);
    if (!deliveryZoneValid.valid) {
      return NextResponse.json(
        { 
          error: 'Zone de livraison non couverte',
          code: 'DELIVERY_ZONE_INVALID',
          message: deliveryZoneValid.message
        },
        { status: 400 }
      );
    }

    // 6. Vérifier la capacité du restaurant
    const capacityCheck = await checkRestaurantCapacity(restaurantId);
    if (!capacityCheck.available) {
      return NextResponse.json(
        { 
          error: 'Restaurant surchargé',
          code: 'RESTAURANT_OVERLOADED',
          message: 'Le restaurant a trop de commandes en cours',
          estimatedWait: capacityCheck.estimatedWait
        },
        { status: 400 }
      );
    }

    // Si tout est OK, retourner la validation
    return NextResponse.json({
      valid: true,
      message: 'Commande validée avec succès',
      restaurant: {
        id: restaurant.id,
        nom: restaurant.nom
      },
      items: menuItems,
      subtotal: subtotal,
      deliveryZone: deliveryZoneValid.zone,
      estimatedPreparationTime: capacityCheck.estimatedPreparationTime
    });

  } catch (error) {
    console.error('Erreur validation commande:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erreur lors de la validation de la commande',
        code: 'VALIDATION_ERROR'
      },
      { status: 400 }
    );
  }
}

// Fonction pour vérifier la zone de livraison
async function checkDeliveryZone(restaurantId, deliveryInfo) {
  try {
    const { data: zones, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    if (error || !zones || zones.length === 0) {
      return { valid: true, message: 'Aucune zone de livraison définie' };
    }

    // Ici vous pouvez implémenter une logique de géolocalisation
    // Pour l'instant, on considère que c'est valide
    return { 
      valid: true, 
      message: 'Zone de livraison valide',
      zone: zones[0]?.name || 'Zone par défaut'
    };
  } catch (error) {
    console.error('Erreur vérification zone:', error);
    return { valid: true, message: 'Vérification zone ignorée' };
  }
}

// Fonction pour vérifier la capacité du restaurant
async function checkRestaurantCapacity(restaurantId) {
  try {
    // Compter les commandes en cours
    const { data: activeOrders, error } = await supabase
      .from('commandes')
      .select('id, statut, created_at')
      .eq('restaurant_id', restaurantId)
      .in('statut', ['en_attente', 'acceptee', 'en_preparation', 'prete']);

    if (error) {
      console.error('Erreur vérification capacité:', error);
      return { available: true, estimatedPreparationTime: 15 };
    }

    const orderCount = activeOrders?.length || 0;
    const maxCapacity = 10; // Capacité maximale du restaurant
    const basePreparationTime = 15; // Temps de base en minutes

    if (orderCount >= maxCapacity) {
      return {
        available: false,
        message: 'Restaurant surchargé',
        estimatedWait: orderCount * 5 // 5 minutes par commande en attente
      };
    }

    return {
      available: true,
      estimatedPreparationTime: basePreparationTime + (orderCount * 2) // +2 min par commande
    };
  } catch (error) {
    console.error('Erreur vérification capacité:', error);
    return { available: true, estimatedPreparationTime: 15 };
  }
}

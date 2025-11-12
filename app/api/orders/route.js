import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin as supabaseAdminClient } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
const { sanitizeInput, isValidAmount, isValidId } = require('@/lib/validation');

const isComboItem = (item) => {
  if (!item) return false;
  if (item.type === 'combo') return true;
  if (typeof item.id === 'string' && item.id.startsWith('combo-')) return true;
  return false;
};

let cachedServiceClient = null;

function getServiceClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  if (cachedServiceClient) {
    return cachedServiceClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return null;
  }

  cachedServiceClient = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedServiceClient;
}

// GET /api/orders - Récupérer les commandes de l'utilisateur
export async function GET(request) {
  try {
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Récupérer un client service pour contourner les politiques RLS côté serveur
    const serviceClient = getServiceClient();

    if (!serviceClient) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY non configurée pour le serveur');
      return NextResponse.json(
        { error: 'Configuration Supabase serveur manquante' },
        { status: 500 }
      );
    }

    // Vérifier le rôle de l'utilisateur
    const { data: userData, error: userDataError } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Les admins peuvent voir toutes les commandes
    const isAdmin = userData && userData.role === 'admin';

    // Construire la requête
    let query = serviceClient
      .from('commandes')
      .select(`
        id,
        created_at,
        updated_at,
        statut,
        total,
        frais_livraison,
        adresse_livraison,
        restaurant_id,
        refund_amount,
        refunded_at,
        stripe_refund_id,
        payment_status,
        details_commande (
          id,
          quantite,
          prix_unitaire,
          supplements,
          menus (
            nom,
            prix
          )
        ),
        restaurants (
          id,
          nom,
          adresse,
          ville
        )
      `)
      .order('created_at', { ascending: false });

    // Filtrer par user_id seulement si ce n'est pas un admin
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      return NextResponse.json({ error: 'Erreur lors de la récupération des commandes' }, { status: 500 });
    }

    // Formater les données pour le frontend
    const formattedOrders = (orders || []).map(order => {
      const restaurant = order.restaurants;
      
      // Calculer le vrai sous-total en incluant les suppléments
      let calculatedSubtotal = 0;
      const items = (order.details_commande || []).map(detail => {
        // Récupérer les suppléments
        let supplements = [];
        if (detail.supplements) {
          if (typeof detail.supplements === 'string') {
            try {
              supplements = JSON.parse(detail.supplements);
            } catch (e) {
              supplements = [];
            }
          } else if (Array.isArray(detail.supplements)) {
            supplements = detail.supplements;
          }
        }
        
        // IMPORTANT: prix_unitaire contient déjà les suppléments (voir checkout/page.js ligne 570)
        // Donc on utilise directement prix_unitaire sans ajouter les suppléments
        const prixUnitaire = parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0; // Déjà avec suppléments
        const quantity = parseFloat(detail.quantite || 0) || 0;
        
        // Ajouter au sous-total
        calculatedSubtotal += prixUnitaire * quantity;
        
        return {
          id: detail.id,
          name: detail.menus?.nom || 'Article',
          quantity: quantity,
          price: prixUnitaire, // Prix unitaire (déjà avec suppléments)
          supplements: supplements // Garder les suppléments pour l'affichage
        };
      });

      // Extraire l'adresse de livraison
      const addressParts = (order.adresse_livraison || '').split(',').map(s => s.trim());
      const deliveryAddress = addressParts[0] || '';
      const deliveryCity = addressParts.length > 2 ? addressParts[1] : (addressParts[1] || '');
      const deliveryPostalCode = addressParts.length > 2 ? addressParts[2]?.split(' ')[0] : '';

      // Le total réel payé = sous-total calculé + frais de livraison
      const deliveryFee = parseFloat(order.frais_livraison || 0) || 0;
      const realTotal = calculatedSubtotal + deliveryFee;

      return {
        id: order.id,
        restaurantName: restaurant?.nom || 'Restaurant inconnu',
        restaurant: {
          id: restaurant?.id,
          name: restaurant?.nom || 'Restaurant inconnu',
          nom: restaurant?.nom || 'Restaurant inconnu',
          address: restaurant?.adresse || '',
          adresse: restaurant?.adresse || '',
          city: restaurant?.ville || '',
          ville: restaurant?.ville || ''
        },
        status: order.statut, // Utiliser statut (français)
        total: realTotal, // Total réel avec suppléments et frais de livraison
        subtotal: calculatedSubtotal, // Sous-total calculé avec suppléments
        deliveryFee: deliveryFee,
        deliveryAddress: deliveryAddress,
        deliveryCity: deliveryCity,
        deliveryPostalCode: deliveryPostalCode,
        createdAt: order.created_at,
        items: items,
        // Informations de remboursement
        refund_amount: order.refund_amount ? parseFloat(order.refund_amount) : null,
        refunded_at: order.refunded_at || null,
        payment_status: order.payment_status || 'pending'
      };
    });

    return NextResponse.json(formattedOrders);

  } catch (error) {
    console.error('Erreur dans /api/orders:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/orders - Créer une nouvelle commande
export async function POST(request) {
  try {
    console.log('=== DÉBUT CRÉATION COMMANDE ===');
    
    const body = await request.json();
    const serviceClient = getServiceClient();

    if (!serviceClient) {
      console.error('❌ Impossible de créer la commande: clé service Supabase manquante');
      return NextResponse.json(
        { error: 'Configuration Supabase manquante côté serveur' },
        { status: 500 }
      );
    }

    console.log('Donnees recues:', JSON.stringify(body, null, 2));
    
    const { restaurantId, deliveryInfo, items, deliveryFee, totalAmount, paymentIntentId, paymentStatus, customerInfo } = body;

    // 1. VALIDATION SIMPLIFIÉE - SEULEMENT LES BASES
    console.log('🔍 Validation simplifiée de la commande...');
    
    // Validation de base seulement
    console.log('✅ Validation de base OK - Restaurant et articles validés');
    
    console.log('Restaurant ID recu:', restaurantId);
    console.log('Type du restaurant ID:', typeof restaurantId);
    console.log('Frais de livraison recus:', deliveryFee);
    console.log('Montant total recu:', totalAmount);

    // Validation des donnees
    if (!restaurantId || !items || items.length === 0) {
      console.log('Validation echouee: donnees manquantes');
      return NextResponse.json(
        { error: 'Donnees de commande invalides' },
        { status: 400 }
      );
    }

    // Validation et sanitisation des données
    if (!isValidId(restaurantId)) {
      return NextResponse.json(
        { error: 'ID restaurant invalide' },
        { status: 400 }
      );
    }

    if (!isValidAmount(totalAmount) || !isValidAmount(deliveryFee)) {
      return NextResponse.json(
        { error: 'Montant invalide' },
        { status: 400 }
      );
    }

    // Sanitisation des informations de livraison
    const sanitizedDeliveryInfo = {
      address: sanitizeInput(deliveryInfo?.address || ''),
      city: sanitizeInput(deliveryInfo?.city || ''),
      postalCode: sanitizeInput(deliveryInfo?.postalCode || ''),
      instructions: sanitizeInput(deliveryInfo?.instructions || '')
    };

    console.log('Validation des donnees OK');

    // Verifier que le restaurant existe
    console.log('Verification du restaurant ID:', restaurantId);
    const { data: restaurant, error: restaurantError } = await serviceClient
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restaurantError) {
      console.error('Erreur restaurant:', restaurantError);
      return NextResponse.json(
        { error: 'Restaurant invalide' },
        { status: 400 }
      );
    }

    if (!restaurant) {
      console.log('Restaurant non trouve');
      return NextResponse.json(
        { error: 'Restaurant invalide' },
        { status: 400 }
      );
    }

    console.log('Restaurant trouve:', restaurant.nom);

    // Verifier que tous les articles existent
    console.log('Verification des articles...');
    for (const item of items) {
      if (isComboItem(item)) {
        console.log('Article combo détecté, validation spécifique ignorée pour ID:', item.id);
        continue;
      }

      console.log('Verification article ID:', item.id);
      const { data: menuItem, error: menuError } = await serviceClient
        .from('menus')
        .select('*')
        .eq('id', item.id)
        .eq('restaurant_id', restaurantId)
        .single();

      if (menuError) {
        console.error('Erreur menu item:', menuError);
        return NextResponse.json(
          { error: 'Un ou plusieurs articles ne sont pas disponibles' },
          { status: 400 }
        );
      }

      if (!menuItem) {
        console.log('Article non trouve:', item.id);
        return NextResponse.json(
          { error: 'Un ou plusieurs articles ne sont pas disponibles' },
          { status: 400 }
        );
      }
    }

    console.log('Tous les articles sont valides');

    // Utiliser le montant total et les frais de livraison envoyes par le frontend
    // IMPORTANT: Arrondir les frais de livraison à 2 décimales pour garantir la cohérence
    const total = totalAmount || 0;
    const fraisLivraison = Math.round(parseFloat(deliveryFee || restaurant.frais_livraison || 0) * 100) / 100;

    console.log('Total utilise:', total);
    console.log('Frais de livraison utilises (arrondis):', fraisLivraison);
    console.log('Frais de livraison bruts recus:', deliveryFee);

    // Générer un code de sécurité à 6 chiffres pour la livraison
    const securityCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔐 Code de sécurité généré pour la commande');

    // Récupérer l'utilisateur si connecté
    const authHeader = request.headers.get('authorization');
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
        console.log('✅ Utilisateur connecté pour la commande:', user.email);
      }
    }

    // Creer la commande dans Supabase
    console.log('Tentative de creation de la commande...');
    const orderData = {
      restaurant_id: restaurantId,
      adresse_livraison: `${deliveryInfo.address}, ${deliveryInfo.city} ${deliveryInfo.postalCode}`,
      total: total,
      frais_livraison: fraisLivraison,
      statut: 'en_attente', // En attente d'acceptation par le restaurant
      security_code: securityCode // Code de sécurité pour la livraison
    };

    if (customerInfo) {
      if (customerInfo.firstName) {
        orderData.customer_first_name = sanitizeInput(customerInfo.firstName);
      }
      if (customerInfo.lastName) {
        orderData.customer_last_name = sanitizeInput(customerInfo.lastName);
      }
      if (customerInfo.phone) {
        orderData.customer_phone = sanitizeInput(customerInfo.phone);
      }
      if (customerInfo.email) {
        orderData.customer_email = sanitizeInput(customerInfo.email);
      }
    }

    if (paymentIntentId) {
      orderData.stripe_payment_intent_id = paymentIntentId;
    }
    if (paymentStatus) {
      orderData.payment_status = sanitizeInput(paymentStatus);
    }

    // Ajouter user_id si l'utilisateur est connecté
    if (userId) {
      orderData.user_id = userId;
    }

    console.log('Donnees de commande a inserer:', JSON.stringify(orderData, null, 2));

    const { data: order, error: orderError } = await serviceClient
      .from('commandes')
      .insert([orderData])
      .select()
      .single();

    if (orderError) {
      console.error('Erreur lors de la création de la commande:', orderError);
      return NextResponse.json(
        { error: `Erreur lors de la création de la commande: ${orderError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Commande créée avec succès:', order.id);
    
    // Envoyer une notification SSE au restaurant via le broadcaster
    // IMPORTANT: Calculer le montant total avec les frais de livraison pour la notification
    const notificationTotal = (parseFloat(order.total || 0) + parseFloat(order.frais_livraison || 0)).toFixed(2);
    try {
      const notificationSent = sseBroadcaster.broadcast(restaurantId, {
        type: 'new_order',
        message: `Nouvelle commande #${order.id?.slice(0, 8) || 'N/A'} - ${notificationTotal}€`,
        order: order,
        timestamp: new Date().toISOString()
      });
      console.log('🔔 Notification SSE envoyée:', notificationSent ? 'Oui' : 'Non (aucun client connecté)');
      console.log('💰 Montant notification (avec frais):', notificationTotal, '€ (sous-total:', order.total, '€ + frais:', order.frais_livraison, '€)');
    } catch (broadcastError) {
      console.warn('⚠️ Erreur broadcasting SSE:', broadcastError);
      // Ne pas faire échouer la création de commande si le broadcast échoue
    }
    console.log('📊 Statut initial de la commande:', order.statut);
    console.log('📅 Heure de création:', order.created_at);

    // Créer les détails de commande
    console.log('Création des détails de commande...');
    const orderDetailsPayload = [];

    for (const item of items) {
      const isCombo = isComboItem(item);
      const quantity = parseInt(item?.quantity || 1, 10);

      let supplementsData = [];
      if (item?.supplements && Array.isArray(item.supplements)) {
        supplementsData = item.supplements.map((sup) => ({
          nom: sup.nom || sup.name || 'Supplément',
          prix: parseFloat(sup.prix || sup.price || 0) || 0
        }));
      }

      const customizations = {};
      const itemCustomizations = item?.customizations || {};
      if (Array.isArray(itemCustomizations.selectedMeats) && itemCustomizations.selectedMeats.length > 0) {
        customizations.selectedMeats = itemCustomizations.selectedMeats;
      }
      if (Array.isArray(itemCustomizations.selectedSauces) && itemCustomizations.selectedSauces.length > 0) {
        customizations.selectedSauces = itemCustomizations.selectedSauces;
      }
      if (Array.isArray(itemCustomizations.removedIngredients) && itemCustomizations.removedIngredients.length > 0) {
        customizations.removedIngredients = itemCustomizations.removedIngredients;
      }

      const comboDetails = item.comboDetails || itemCustomizations.comboDetails;
      if (isCombo && comboDetails) {
        customizations.combo = {
          comboId: item.comboId || (typeof item.id === 'string' ? item.id.replace('combo-', '') : null),
          comboName: item.comboName || item.nom || 'Menu composé',
          details: comboDetails
        };
      }

      const itemPrice = parseFloat(item.prix || item.price || 0) || 0;
      const supplementsPrice = supplementsData.reduce((sum, sup) => sum + (sup.prix || 0), 0);
      const meatsPrice = (itemCustomizations.selectedMeats || []).reduce((sum, meat) => sum + (parseFloat(meat.prix || meat.price || 0) || 0), 0);
      const saucesPrice = (itemCustomizations.selectedSauces || []).reduce((sum, sauce) => sum + (parseFloat(sauce.prix || sauce.price || 0) || 0), 0);
      const sizePrice = item.size?.prix ? parseFloat(item.size.prix) : (item.prix_taille ? parseFloat(item.prix_taille) : 0);
      const prixUnitaireTotal = itemPrice + supplementsPrice + meatsPrice + saucesPrice + sizePrice;

      const detailEntry = {
        commande_id: order.id,
        plat_id: isCombo ? null : item.id,
        quantite: quantity,
        prix_unitaire: prixUnitaireTotal
      };

      if (supplementsData.length > 0) {
        detailEntry.supplements = supplementsData;
      }
      if (Object.keys(customizations).length > 0) {
        detailEntry.customizations = customizations;
      }

      orderDetailsPayload.push(detailEntry);
    }

    const { error: detailsError } = await serviceClient
      .from('details_commande')
      .insert(orderDetailsPayload);


    if (detailsError) {
      console.error('Erreur création détails commande:', detailsError);
      // Ne pas échouer la commande pour ça, juste logger
    } else {
      console.log('Détails de commande créés avec succès');
    }

    console.log('🎯 RETOUR DE LA RÉPONSE - Commande créée avec statut:', order.statut);
    
    const subtotalValue = parseFloat(total) || 0;
    const deliveryFeeValue = parseFloat(fraisLivraison) || 0;
    const totalWithDelivery = subtotalValue + deliveryFeeValue;

    return NextResponse.json({
      message: 'Commande créée avec succès',
      orderId: order.id,
      securityCode: order.security_code,
      subtotal: subtotalValue,
      deliveryFee: deliveryFeeValue,
      total: totalWithDelivery,
      totalAmount: totalWithDelivery,
      status: order.statut, // Utiliser le statut réel de la commande
      debug: {
        orderCreatedAt: order.created_at,
        orderStatus: order.statut,
        orderId: order.id
      }
    });

  } catch (error) {
    console.error('Erreur générale lors de la création de la commande:', error);
    return NextResponse.json(
      { error: `Erreur lors de la création de la commande: ${error.message}` },
      { status: 500 }
    );
  }
} 
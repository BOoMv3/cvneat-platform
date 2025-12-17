import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin as supabaseAdminClient } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { cleanupExpiredOrders } from '../../../lib/orderCleanup';
const { sanitizeInput, isValidAmount, isValidId } = require('@/lib/validation');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const isComboItem = (item) => {
  if (!item) return false;
  if (item.type === 'combo') return true;
  if (typeof item.id === 'string' && item.id.startsWith('combo-')) return true;
  if (item.is_formula === true) return true; // Les formules sont aussi des combos
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
    // Nettoyer les commandes expirées en arrière-plan (non bloquant)
    cleanupExpiredOrders().catch(err => {
      console.warn('⚠️ Erreur nettoyage commandes expirées (non bloquant):', err);
    });
    
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ API /orders: Token manquant dans les headers');
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 API /orders: Token reçu, longueur:', token?.length || 0);
    
    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ API /orders: Erreur authentification:', authError?.message || 'User null');
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }
    
    console.log('✅ API /orders: Utilisateur authentifié:', user.id?.slice(0, 8));

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

    // Construire la requête (très simplifiée - récupérer relations séparément pour éviter erreurs)
    // NOTE: platform_fee n'existe pas dans la table commandes, donc on ne le sélectionne pas
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
        user_id,
        stripe_payment_intent_id,
        refund_amount,
        refunded_at,
        stripe_refund_id,
        payment_status
      `)
      .order('created_at', { ascending: false });

    // Filtrer par user_id seulement si ce n'est pas un admin
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error('❌ API /orders: Erreur récupération commandes:', ordersError);
      console.error('   Détails:', JSON.stringify(ordersError, null, 2));
      return NextResponse.json({ error: 'Erreur lors de la récupération des commandes', details: ordersError.message }, { status: 500 });
    }
    
    console.log(`✅ API /orders: ${orders?.length || 0} commandes récupérées pour utilisateur ${user.id?.slice(0, 8)}`);

    // Récupérer les restaurants séparément
    const restaurantIds = [...new Set((orders || []).map(o => o.restaurant_id).filter(Boolean))];
    const restaurantsMap = new Map();
    
    if (restaurantIds.length > 0) {
      try {
        const { data: restaurants, error: restaurantsError } = await serviceClient
          .from('restaurants')
          .select('id, nom, adresse, ville')
          .in('id', restaurantIds);
        
        if (!restaurantsError && restaurants) {
          restaurants.forEach(r => restaurantsMap.set(r.id, r));
          console.log(`✅ ${restaurants.length} restaurants récupérés`);
        } else if (restaurantsError) {
          console.error('❌ Erreur récupération restaurants (non bloquant):', restaurantsError.message);
        }
      } catch (restaurantsErr) {
        console.error('❌ Exception récupération restaurants (non bloquant):', restaurantsErr?.message);
      }
    }

    // Récupérer les détails séparément pour toutes les commandes
    let ordersWithDetails = orders || [];
    if (orders && orders.length > 0) {
      const orderIds = orders.map(o => o.id).filter(Boolean);
      if (orderIds.length > 0) {
        try {
          console.log(`🔍 Récupération détails pour ${orderIds.length} commandes...`);
          
          const { data: allDetails, error: detailsError } = await serviceClient
            .from('details_commande')
            .select(`
              id,
              commande_id,
              plat_id,
              quantite,
              prix_unitaire,
              supplements,
              customizations,
              menus (
                nom,
                prix
              )
            `)
            .in('commande_id', orderIds);
          
          if (detailsError) {
            console.error('❌ Erreur récupération détails (non bloquant):', detailsError.message);
          } else if (allDetails && allDetails.length > 0) {
            console.log(`✅ ${allDetails.length} détails récupérés séparément`);
            
            // Grouper les détails par commande_id
            const detailsByOrderId = new Map();
            allDetails.forEach(detail => {
              if (!detailsByOrderId.has(detail.commande_id)) {
                detailsByOrderId.set(detail.commande_id, []);
              }
              detailsByOrderId.get(detail.commande_id).push(detail);
            });
            
            // Ajouter les détails et restaurants aux commandes
            ordersWithDetails = orders.map(order => ({
              ...order,
              details_commande: detailsByOrderId.get(order.id) || [],
              restaurants: restaurantsMap.get(order.restaurant_id) || null
            }));
          } else {
            console.log(`ℹ️ Aucun détail trouvé pour ${orderIds.length} commandes`);
            // Ajouter quand même les restaurants
            ordersWithDetails = orders.map(order => ({
              ...order,
              details_commande: [],
              restaurants: restaurantsMap.get(order.restaurant_id) || null
            }));
          }
        } catch (detailsFetchError) {
          console.error('❌ Erreur récupération détails (non bloquant):', detailsFetchError?.message);
          // Ajouter quand même les restaurants même si détails échouent
          ordersWithDetails = orders.map(order => ({
            ...order,
            details_commande: [],
            restaurants: restaurantsMap.get(order.restaurant_id) || null
          }));
        }
      }
    }

    // Formater les données pour le frontend
    // Note: Utiliser Promise.all car on peut avoir des appels async à Stripe
    const formattedOrders = await Promise.all((ordersWithDetails || []).map(async (order) => {
      const restaurant = order.restaurants;
      
      // Log si pas de détails pour cette commande
      if (!order.details_commande || !Array.isArray(order.details_commande) || order.details_commande.length === 0) {
        console.warn(`⚠️ API /orders: Commande ${order.id?.slice(0, 8)} sans détails dans l'objet order après récupération`);
        console.warn(`   Type:`, typeof order.details_commande);
        console.warn(`   Est tableau:`, Array.isArray(order.details_commande));
        console.warn(`   Valeur brute:`, JSON.stringify(order.details_commande, null, 2));
      }
      
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
        
        // Récupérer les customizations pour les combos
        let customizations = {};
        if (detail.customizations) {
          if (typeof detail.customizations === 'string') {
            try {
              customizations = JSON.parse(detail.customizations);
            } catch (e) {
              customizations = {};
            }
          } else {
            customizations = detail.customizations;
          }
        }
        
        // Pour les combos, utiliser le nom du combo au lieu du nom du plat de référence
        const isCombo = customizations.combo && customizations.combo.comboName;
        const displayName = isCombo ? customizations.combo.comboName : (detail.menus?.nom || 'Article');
        const comboDetails = isCombo ? customizations.combo.details : null;
        
        // IMPORTANT: prix_unitaire contient déjà les suppléments (voir checkout/page.js ligne 570)
        // Donc on utilise directement prix_unitaire sans ajouter les suppléments
        const prixUnitaire = parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0; // Déjà avec suppléments
        const quantity = parseFloat(detail.quantite || 0) || 0;
        
        // Ajouter au sous-total
        calculatedSubtotal += prixUnitaire * quantity;
        
        return {
          id: detail.id,
          name: displayName,
          quantity: quantity,
          price: prixUnitaire, // Prix unitaire (déjà avec suppléments)
          supplements: supplements, // Garder les suppléments pour l'affichage
          isCombo: isCombo,
          comboDetails: comboDetails // Détails du combo pour l'affichage
        };
      });

      // Extraire l'adresse de livraison
      const addressParts = (order.adresse_livraison || '').split(',').map(s => s.trim());
      const deliveryAddress = addressParts[0] || '';
      const deliveryCity = addressParts.length > 2 ? addressParts[1] : (addressParts[1] || '');
      const deliveryPostalCode = addressParts.length > 2 ? addressParts[2]?.split(' ')[0] : '';

      // Récupérer le montant réellement payé depuis Stripe si disponible
      // NOTE: platform_fee n'existe pas dans la table commandes, utiliser valeur par défaut
      let actualDeliveryFee = parseFloat(order.frais_livraison || 0) || 0;
      let actualPlatformFee = 0.49; // Frais plateforme fixe par défaut (colonne n'existe pas en BDD)
      let actualTotal = calculatedSubtotal + actualDeliveryFee + actualPlatformFee;
      
      // Si un PaymentIntent existe, récupérer le montant réellement payé
      // IMPORTANT: Ne pas faire échouer toute la récupération si Stripe échoue
      if (order.stripe_payment_intent_id && stripe) {
        try {
          // Récupérer le PaymentIntent avec un timeout de 2 secondes
          const paymentIntent = await Promise.race([
            stripe.paymentIntents.retrieve(order.stripe_payment_intent_id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
          ]);
          
          if (paymentIntent && paymentIntent.amount) {
            // Montant en centimes, convertir en euros
            const paidAmount = paymentIntent.amount / 100;
            
            // Calculer les frais réels à partir du montant payé
            // paidAmount = subtotal + deliveryFee + platformFee
            // Donc: deliveryFee + platformFee = paidAmount - subtotal
            const feesTotal = paidAmount - calculatedSubtotal;
            
            // Si les frais calculés sont différents de ceux stockés, utiliser les frais réels
            if (feesTotal > 0 && Math.abs(feesTotal - (actualDeliveryFee + actualPlatformFee)) > 0.01) {
              // Essayer de séparer les frais de livraison et de plateforme
              // On connaît le frais de plateforme (0.49€ généralement)
              const knownPlatformFee = actualPlatformFee || 0.49;
              actualDeliveryFee = Math.max(0, feesTotal - knownPlatformFee);
              actualPlatformFee = knownPlatformFee;
              actualTotal = paidAmount;
              
              console.log('💰 Frais réels calculés depuis Stripe:', {
                orderId: order.id,
                paidAmount,
                calculatedSubtotal,
                actualDeliveryFee,
                actualPlatformFee,
                storedDeliveryFee: order.frais_livraison,
                storedPlatformFee: actualPlatformFee
              });
            }
          }
        } catch (stripeError) {
          // Ignorer silencieusement les erreurs Stripe pour ne pas bloquer la récupération des commandes
          // Les valeurs stockées en BDD seront utilisées
          if (stripeError?.message && stripeError.message !== 'Timeout') {
            // Log uniquement en mode développement
            if (process.env.NODE_ENV === 'development') {
              console.warn('⚠️ Impossible de récupérer le PaymentIntent Stripe pour commande', order.id?.slice(0, 8), ':', stripeError.message);
            }
          }
          // Continuer avec les valeurs stockées - ne pas propager l'erreur
        }
      }
      
      const deliveryFee = actualDeliveryFee;
      const platformFee = actualPlatformFee;
      const realTotal = actualTotal;

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
        total: realTotal, // Total réel avec suppléments, frais de livraison et frais de plateforme
        subtotal: calculatedSubtotal, // Sous-total calculé avec suppléments
        deliveryFee: deliveryFee,
        platformFee: platformFee,
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
    }));

    return NextResponse.json(formattedOrders);

  } catch (error) {
    console.error('❌ Erreur dans /api/orders:', error);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    console.error('   Type:', error.name);
    return NextResponse.json({ 
      error: 'Erreur serveur lors de la récupération des commandes',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    }, { status: 500 });
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
    
    const { restaurantId, deliveryInfo, items, deliveryFee, totalAmount, paymentIntentId, paymentStatus, customerInfo, discountAmount = 0, platformFee = 0, promoCodeId = null, promoCode = null } = body;

    // 1. VALIDATION SIMPLIFIÉE - SEULEMENT LES BASES
    console.log('🔍 Validation simplifiée de la commande...');
    
    // Validation de base seulement
    console.log('✅ Validation de base OK - Restaurant et articles validés');
    
    console.log('Restaurant ID recu:', restaurantId);
    console.log('Type du restaurant ID:', typeof restaurantId);
    console.log('Frais de livraison recus:', deliveryFee);
    console.log('Montant total recu:', totalAmount);

    // Validation des donnees
    if (!restaurantId) {
      console.error('❌ Validation échouée: restaurantId manquant');
      return NextResponse.json(
        { error: 'Restaurant non spécifié' },
        { status: 400 }
      );
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ Validation échouée: items manquants ou vides');
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
    // IMPORTANT: Vérifier que le code postal est présent (peut être postalCode ou postal_code)
    const postalCode = deliveryInfo?.postalCode || deliveryInfo?.postal_code || '';
    
    if (!postalCode || postalCode.trim() === '') {
      console.error('❌ Validation échouée: code postal manquant dans deliveryInfo');
      return NextResponse.json(
        { error: 'Le code postal est obligatoire pour la livraison' },
        { status: 400 }
      );
    }

    const sanitizedDeliveryInfo = {
      address: sanitizeInput(deliveryInfo?.address || ''),
      city: sanitizeInput(deliveryInfo?.city || ''),
      postalCode: sanitizeInput(postalCode),
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

    // Verifier que tous les articles existent (sauf formules qui sont validées différemment)
    console.log('Verification des articles...');
    for (const item of items) {
      // Ignorer la validation pour les combos et formules (validées différemment)
      if (isComboItem(item) || item.is_formula === true) {
        console.log('Article combo/formule détecté, validation spécifique ignorée pour:', item.id || item.nom);
        
        // Pour les formules, on accepte avec ou sans formula_items
        // CAS 1: Avec formula_items détaillés
        // CAS 2: Sans formula_items (la formule elle-même est un article menu valide)
        if (item.is_formula) {
          if (item.formula_items && Array.isArray(item.formula_items) && item.formula_items.length > 0) {
            console.log('✅ Formule avec formula_items:', item.formula_items.length, 'éléments');
          } else if (item.id) {
            console.log('✅ Formule sans formula_items, utilisation de l\'ID de la formule:', item.id);
          } else {
            console.error('❌ Formule sans ID ni formula_items:', item);
            return NextResponse.json(
              { error: 'Formule invalide: ID ou éléments manquants' },
              { status: 400 }
            );
          }
        }
        continue;
      }

      // Validation pour les articles normaux
      if (!item.id) {
        console.error('❌ Article sans ID:', item);
        return NextResponse.json(
          { error: 'Article invalide: ID manquant' },
          { status: 400 }
        );
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
    console.log('📦 Items reçus pour la commande:', JSON.stringify(items.map(item => ({
      id: item.id,
      nom: item.nom || item.name,
      is_formula: item.is_formula,
      formula_items: item.formula_items?.length || 0,
      selected_drink: item.selected_drink ? 'Oui' : 'Non',
      quantity: item.quantity
    })), null, 2));

    // Utiliser le montant total et les frais de livraison envoyes par le frontend
    // IMPORTANT: Arrondir les frais de livraison à 2 décimales pour garantir la cohérence
    const subtotalBeforeDiscount = totalAmount || 0; // correspond au sous-total articles (S)
    const discount = Math.max(0, parseFloat(discountAmount) || 0);
    const platform_fee = Math.max(0, parseFloat(platformFee) || 0);
    const total = subtotalBeforeDiscount; // on stocke dans 'total' le sous-total articles (hors frais/discount)
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
    let userData = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
        console.log('✅ Utilisateur connecté pour la commande:', user.email);
        
        // Récupérer les informations utilisateur depuis la table users
        const { data: userInfo, error: userInfoError } = await serviceClient
          .from('users')
          .select('nom, prenom, telephone, email')
          .eq('id', user.id)
          .single();
        
        if (!userInfoError && userInfo) {
          userData = userInfo;
          console.log('✅ Informations utilisateur récupérées:', userInfo);
        }
      }
    }

    // Calculs financiers: commission/payout (AVANT la création de orderData)
    // Utiliser le commission_rate du restaurant (par défaut 20% si non défini)
    const restaurantCommissionRate = restaurant?.commission_rate 
      ? parseFloat(restaurant.commission_rate) / 100 
      : 0.20; // 20% par défaut
    const commissionGross = Math.round((total * restaurantCommissionRate) * 100) / 100;
    const restaurantPayout = Math.round((total * (1 - restaurantCommissionRate)) * 100) / 100;
    const commissionNet = commissionGross + platform_fee; // Commission + frais plateforme
    
    console.log('Finance computation:', {
      commission_rate: restaurantCommissionRate * 100,
      commission_gross: commissionGross,
      commission_net: commissionNet,
      restaurant_payout: restaurantPayout,
      discount,
      platform_fee
    });

    // Creer la commande dans Supabase
    console.log('Tentative de creation de la commande...');
    // IMPORTANT: Le code postal et les instructions sont inclus dans adresse_livraison, pas besoin de colonnes séparées
    // Si des instructions existent, on peut les ajouter à l'adresse ou les stocker ailleurs
    let adresseComplete = `${sanitizedDeliveryInfo.address}, ${sanitizedDeliveryInfo.city} ${sanitizedDeliveryInfo.postalCode}`;
    if (sanitizedDeliveryInfo.instructions && sanitizedDeliveryInfo.instructions.trim()) {
      adresseComplete += ` (Instructions: ${sanitizedDeliveryInfo.instructions.trim()})`;
    }
    
    const orderData = {
      restaurant_id: restaurantId,
      adresse_livraison: adresseComplete,
      ville_livraison: sanitizedDeliveryInfo.city || null,
      total: total, // sous-total articles
      frais_livraison: fraisLivraison,
      statut: paymentStatus === 'pending_payment' ? 'en_attente' : 'en_attente', // En attente de paiement ou d'acceptation
      security_code: securityCode, // Code de sécurité pour la livraison
      delivery_requested_at: new Date().toISOString(), // Timestamp pour l'expiration automatique si aucun livreur n'accepte
      // Stocker les informations du code promo si présent
      promo_code_id: promoCodeId || null,
      promo_code: promoCode || null,
      discount_amount: discountAmount || 0,
      // Stocker les informations de commission
      commission_rate: restaurantCommissionRate * 100, // En pourcentage (ex: 15.00)
      commission_amount: commissionGross,
      restaurant_payout: restaurantPayout
    };

    // Prioriser les informations depuis customerInfo, sinon utiliser userData
    if (customerInfo) {
      if (customerInfo.firstName) {
        orderData.customer_first_name = sanitizeInput(customerInfo.firstName);
      } else if (userData?.prenom) {
        orderData.customer_first_name = sanitizeInput(userData.prenom);
      }
      if (customerInfo.lastName) {
        orderData.customer_last_name = sanitizeInput(customerInfo.lastName);
      } else if (userData?.nom) {
        orderData.customer_last_name = sanitizeInput(userData.nom);
      }
      if (customerInfo.phone) {
        orderData.customer_phone = sanitizeInput(customerInfo.phone);
      } else if (userData?.telephone) {
        orderData.customer_phone = sanitizeInput(userData.telephone);
      }
      if (customerInfo.email) {
        orderData.customer_email = sanitizeInput(customerInfo.email);
      } else if (userData?.email) {
        orderData.customer_email = sanitizeInput(userData.email);
      }
    } else if (userData) {
      // Si pas de customerInfo mais userData disponible, utiliser userData
      if (userData.prenom) {
        orderData.customer_first_name = sanitizeInput(userData.prenom);
      }
      if (userData.nom) {
        orderData.customer_last_name = sanitizeInput(userData.nom);
      }
      if (userData.telephone) {
        orderData.customer_phone = sanitizeInput(userData.telephone);
      }
      if (userData.email) {
        orderData.customer_email = sanitizeInput(userData.email);
      }
    }

    if (paymentIntentId) {
      orderData.stripe_payment_intent_id = paymentIntentId;
    }
    if (paymentStatus) {
      // Valider que paymentStatus correspond à la contrainte CHECK
      const validStatuses = ['pending', 'paid', 'failed', 'cancelled', 'refunded'];
      const sanitizedStatus = sanitizeInput(paymentStatus);
      
      if (!validStatuses.includes(sanitizedStatus)) {
        console.error('❌ ERREUR: payment_status invalide:', sanitizedStatus);
        console.error('   Valeurs autorisées:', validStatuses);
        // Convertir 'pending_payment' en 'pending' pour compatibilité
        if (sanitizedStatus === 'pending_payment') {
          orderData.payment_status = 'pending';
          console.log('   ✅ Conversion: pending_payment -> pending');
        } else {
          return NextResponse.json(
            { error: `Statut de paiement invalide: ${sanitizedStatus}. Valeurs autorisées: ${validStatuses.join(', ')}` },
            { status: 400 }
          );
        }
      } else {
        orderData.payment_status = sanitizedStatus;
      }
    } else {
      // Valeur par défaut si non spécifié
      orderData.payment_status = 'pending';
    }

    // Ajouter user_id si l'utilisateur est connecté
    // IMPORTANT: Si user_id est NOT NULL dans la table, on doit forcer la connexion
    if (userId) {
      orderData.user_id = userId;
    } else {
      // Si pas d'utilisateur connecté, vérifier si user_id est requis
      // Pour l'instant, on exige un utilisateur connecté pour éviter les erreurs
      console.error('❌ ERREUR: Pas d\'utilisateur connecté');
      return NextResponse.json(
        { error: 'Vous devez être connecté pour passer une commande' },
        { status: 401 }
      );
    }

    // Validation finale avant insertion
    if (!orderData.restaurant_id) {
      console.error('❌ ERREUR: restaurant_id manquant');
      return NextResponse.json(
        { error: 'Restaurant non spécifié' },
        { status: 400 }
      );
    }
    
    if (!orderData.adresse_livraison || orderData.adresse_livraison.trim().length === 0) {
      console.error('❌ ERREUR: adresse_livraison manquante');
      return NextResponse.json(
        { error: 'Adresse de livraison requise' },
        { status: 400 }
      );
    }
    
    if (!orderData.total || orderData.total <= 0 || isNaN(orderData.total)) {
      console.error('❌ ERREUR: total invalide:', orderData.total);
      return NextResponse.json(
        { error: 'Montant de commande invalide' },
        { status: 400 }
      );
    }

    console.log('📦 Données de commande à insérer:', JSON.stringify(orderData, null, 2));
    console.log('📦 Nombre de champs:', Object.keys(orderData).length);
    console.log('📦 Vérification des champs critiques:');
    console.log('   - restaurant_id:', orderData.restaurant_id, typeof orderData.restaurant_id);
    console.log('   - user_id:', orderData.user_id, typeof orderData.user_id);
    console.log('   - total:', orderData.total, typeof orderData.total);
    console.log('   - frais_livraison:', orderData.frais_livraison, typeof orderData.frais_livraison);
    console.log('   - adresse_livraison:', orderData.adresse_livraison ? `${orderData.adresse_livraison.substring(0, 50)}...` : 'MANQUANT');
    console.log('   - statut:', orderData.statut);
    console.log('   - payment_status:', orderData.payment_status);

    let order, orderError;
    try {
      // Spécifier explicitement les colonnes à récupérer (SANS code_postal_livraison qui n'existe pas)
      const result = await serviceClient
        .from('commandes')
        .insert([orderData])
        .select('id, restaurant_id, total, frais_livraison, statut, adresse_livraison, ville_livraison, security_code, created_at, user_id, customer_email, customer_first_name, customer_last_name, customer_phone, payment_status, stripe_payment_intent_id, promo_code_id, promo_code, discount_amount, commission_rate, commission_amount, restaurant_payout')
        .single();
      order = result.data;
      orderError = result.error;
    } catch (insertError) {
      console.error('❌ EXCEPTION lors de l\'insertion:', insertError);
      orderError = insertError;
    }

    if (orderError) {
      console.error('❌ ERREUR création commande dans Supabase:', orderError);
      console.error('❌ Code erreur:', orderError.code);
      console.error('❌ Détails:', orderError.details);
      console.error('❌ Hint:', orderError.hint);
      console.error('❌ Message:', orderError.message);
      console.error('❌ Données tentées:', JSON.stringify(orderData, null, 2));
      
      // Message d'erreur plus clair selon le type d'erreur
      let errorMessage = 'Erreur lors de la création de la commande';
      if (orderError.code === '23503') {
        errorMessage = 'Erreur: Restaurant ou utilisateur invalide';
      } else if (orderError.code === '23505') {
        errorMessage = 'Erreur: Commande déjà existante';
      } else if (orderError.code === '23502') {
        errorMessage = 'Erreur: Données manquantes pour la commande';
      } else if (orderError.message) {
        errorMessage = `Erreur: ${orderError.message}`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? orderError.message : undefined
        },
        { status: 500 }
      );
    }

    console.log('✅ Commande créée avec succès:', order.id);
    console.log('📊 Statut initial de la commande:', order.statut);
    console.log('💳 Statut paiement initial:', order.payment_status);
    // IMPORTANT: Ne pas envoyer de notification SSE ici car le paiement n'est pas encore validé
    // La notification sera envoyée uniquement après confirmation du paiement dans:
    // - app/api/payment/confirm/route.js (confirmation côté client)
    // - app/api/stripe/webhook/route.js (webhook Stripe)
    console.log('📅 Heure de création:', order.created_at);

    // Créer les détails de commande
    console.log('Création des détails de commande...');
    const orderDetailsPayload = [];

    // Vérifier si le client a un gain "boisson offerte" actif
    let freeDrinkAdded = false;
    if (userId) {
      const { data: freeDrinkWin, error: freeDrinkError } = await serviceClient
        .from('wheel_wins')
        .select('*')
        .eq('user_id', userId)
        .eq('prize_type', 'free_drink')
        .is('used_at', null) // Non utilisé
        .gte('valid_until', new Date().toISOString()) // Valide
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!freeDrinkError && freeDrinkWin) {
        console.log('🥤 Gain "boisson offerte" détecté, ajout d\'une boisson gratuite...');
        
        // Chercher une boisson standard du restaurant (catégorie "Boissons" ou nom contenant "boisson")
        const { data: drinks, error: drinksError } = await serviceClient
          .from('menus')
          .select('id, nom, prix, categorie')
          .eq('restaurant_id', restaurantId)
          .or('categorie.ilike.%boisson%,nom.ilike.%boisson%,nom.ilike.%coca%,nom.ilike.%soda%')
          .order('prix', { ascending: true })
          .limit(1);

        if (!drinksError && drinks && drinks.length > 0) {
          const freeDrink = drinks[0];
          orderDetailsPayload.push({
            commande_id: order.id,
            plat_id: freeDrink.id,
            quantite: 1,
            prix_unitaire: 0, // Gratuit
            customizations: {
              is_free_drink: true,
              wheel_win_id: freeDrinkWin.id,
              note: 'Boisson offerte - Gain de la roue de la chance'
            }
          });
          freeDrinkAdded = true;
          console.log(`✅ Boisson offerte ajoutée: ${freeDrink.nom} (gratuite)`);
        } else {
          console.log('⚠️ Aucune boisson trouvée pour ce restaurant, gain non appliqué');
        }
      }
    }

    for (const item of items) {
      const isCombo = isComboItem(item);
      const isFormula = item.is_formula === true;
      const quantity = parseInt(item?.quantity || 1, 10);
      
      // Log pour déboguer les boissons
      console.log(`📦 Traitement item: ${item.nom || 'Sans nom'}`, {
        isFormula,
        hasSelectedDrink: !!item.selected_drink,
        selectedDrink: item.selected_drink?.nom || item.selected_drink?.name || null,
        drinkOptions: item.drink_options?.length || 0
      });

      // CORRECTION FORMULES: Gérer les formules avec OU sans formula_items
      if (isFormula) {
        console.log(`📦 Formule détectée: ${item.nom || 'Formule'}`);
        console.log(`   - formula_items: ${item.formula_items?.length || 0}`);
        console.log(`   - selected_drink: ${item.selected_drink ? 'Oui' : 'Non'}`);
        console.log(`   - item.id: ${item.id}`);
        
        const totalFormulaPrice = parseFloat(item.prix || item.price || 0) || 0;
        
        // CAS 1: Formule AVEC formula_items détaillés
        if (item.formula_items && Array.isArray(item.formula_items) && item.formula_items.length > 0) {
          let firstItem = true;
          
          // Gérer les choix optionnels (pour Menu Enfants par exemple)
          const selectedOptions = item.selected_formula_options || {};
          const isMenuEnfants = item.nom?.toLowerCase().includes('enfant') || item.nom?.toLowerCase().includes('enfant');
          
          for (const formulaItem of item.formula_items) {
            const formulaItemId = formulaItem.menu_id || formulaItem.menu?.id || formulaItem.id;
            
            if (!formulaItemId) {
              console.error('❌ Élément de formule sans ID menu:', formulaItem);
              continue;
            }

            // Si c'est le Menu Enfants et qu'il y a des choix optionnels, vérifier si cet item doit être inclus
            if (isMenuEnfants && selectedOptions['main_choice']) {
              const menuName = formulaItem.menu?.nom?.toLowerCase() || '';
              const isChoiceItem = menuName.includes('cheese') || menuName.includes('burger') || menuName.includes('nugget');
              
              // Si c'est un item de choix et qu'il n'est pas sélectionné, le sauter
              if (isChoiceItem && formulaItemId !== selectedOptions['main_choice']) {
                console.log(`⏭️ Item ${formulaItem.menu?.nom} non sélectionné, ignoré`);
                continue;
              }
            }

            const formulaItemPrice = firstItem ? totalFormulaPrice : 0;
            const itemQuantity = parseInt(formulaItem.quantity || 1, 10) * quantity;
            
            // Récupérer les customizations depuis l'item (si disponibles)
            const itemCustomizations = item.customizations || {};
            
            const detailEntry = {
              commande_id: order.id,
              plat_id: formulaItemId,
              quantite: itemQuantity,
              prix_unitaire: formulaItemPrice,
              customizations: {
                is_formula_item: true,
                formula_name: item.nom || 'Formule',
                formula_id: item.id || item.formula_id,
                order_index: formulaItem.order_index || 0,
                // Inclure les customizations du burger (ingrédients retirés/ajoutés, viandes, sauces)
                selectedMeats: itemCustomizations.selectedMeats || [],
                selectedSauces: itemCustomizations.selectedSauces || [],
                removedIngredients: itemCustomizations.removedIngredients || [],
                addedIngredients: itemCustomizations.addedIngredients || []
              }
            };

            orderDetailsPayload.push(detailEntry);
            firstItem = false;
          }
          
          // Ajouter l'item sélectionné pour les choix optionnels si ce n'est pas déjà dans formula_items
          if (isMenuEnfants && selectedOptions['main_choice']) {
            const alreadyIncluded = item.formula_items.some(fi => {
              const fiId = fi.menu_id || fi.menu?.id || fi.id;
              return fiId === selectedOptions['main_choice'];
            });
            
            if (!alreadyIncluded) {
              // Récupérer les détails de l'item sélectionné
              const { data: selectedMenu } = await serviceClient
                .from('menus')
                .select('id, nom, prix')
                .eq('id', selectedOptions['main_choice'])
                .single();
              
              if (selectedMenu) {
                const detailEntry = {
                  commande_id: order.id,
                  plat_id: selectedMenu.id,
                  quantite: quantity,
                  prix_unitaire: 0, // Inclus dans le prix de la formule
                  customizations: {
                    is_formula_item: true,
                    is_selected_choice: true,
                    formula_name: item.nom || 'Formule',
                    formula_id: item.id || item.formula_id,
                    order_index: 1
                  }
                };
                orderDetailsPayload.push(detailEntry);
                console.log(`✅ Item sélectionné ajouté: ${selectedMenu.nom}`);
              }
            }
          }
        } 
        // CAS 2: Formule SANS formula_items (cas Cevenol Burger) - créer un détail unique avec l'ID de la formule
        else {
          console.log(`⚠️ Formule sans formula_items détaillés, création d'un détail unique`);
          console.log(`   Item complet:`, JSON.stringify(item, null, 2));
          
          // Utiliser l'ID de la formule directement comme plat_id
          // L'ID de formule est un UUID valide qui référence la table menus
          const formulaId = item.id || item.formula_id || item.menu_id;
          
          if (formulaId) {
            // Vérifier que l'ID existe dans la table menus
            const { data: menuCheck, error: menuCheckError } = await serviceClient
              .from('menus')
              .select('id, nom')
              .eq('id', formulaId)
              .single();
            
            if (menuCheckError || !menuCheck) {
              console.error(`❌ ID de formule non trouvé dans menus: ${formulaId}`, menuCheckError);
              // Essayer avec l'ID du plat principal si disponible
              console.error('   Item:', JSON.stringify({ id: item.id, nom: item.nom, formula_id: item.formula_id }, null, 2));
            } else {
              console.log(`✅ ID de formule vérifié dans menus: ${formulaId} -> ${menuCheck.nom}`);
            }
            
            // Vérifier si c'est une formule de la table formulas ou un menu avec is_formula
            let actualFormulaId = null;
            let formulaItemsDetails = []; // Stocker les détails des items de la formule
            
            const { data: formulaCheck } = await serviceClient
              .from('formulas')
              .select('id')
              .eq('id', formulaId)
              .maybeSingle();
            
            if (formulaCheck) {
              actualFormulaId = formulaId; // C'est une formule de la table formulas
            } else {
              // C'est peut-être un menu avec is_formula, chercher dans formulas par restaurant_id
              const { data: menuCheck } = await serviceClient
                .from('menus')
                .select('restaurant_id')
                .eq('id', formulaId)
                .maybeSingle();
              
              if (menuCheck) {
                // Chercher une formule avec le même nom dans ce restaurant
                const { data: formulaByName } = await serviceClient
                  .from('formulas')
                  .select('id')
                  .eq('restaurant_id', menuCheck.restaurant_id)
                  .eq('nom', item.nom || '')
                  .maybeSingle();
                
                if (formulaByName) {
                  actualFormulaId = formulaByName.id;
                }
              }
            }
            
            // IMPORTANT: Récupérer les formula_items depuis la base de données pour stocker les détails réels
            if (actualFormulaId) {
              try {
                const { data: formulaItems, error: formulaItemsError } = await serviceClient
                  .from('formula_items')
                  .select(`
                    id,
                    order_index,
                    quantity,
                    menu:menus(
                      id,
                      nom,
                      prix
                    )
                  `)
                  .eq('formula_id', actualFormulaId)
                  .order('order_index');
                
                if (!formulaItemsError && formulaItems && formulaItems.length > 0) {
                  formulaItemsDetails = formulaItems.map(fi => ({
                    id: fi.menu?.id,
                    nom: fi.menu?.nom || 'Article',
                    prix: fi.menu?.prix || 0,
                    quantity: fi.quantity || 1,
                    order_index: fi.order_index || 0
                  }));
                  console.log(`✅ ${formulaItemsDetails.length} éléments de formule récupérés pour stockage`);
                } else {
                  console.warn(`⚠️ Aucun formula_items trouvé pour formula_id: ${actualFormulaId}`);
                }
              } catch (err) {
                console.error('❌ Erreur récupération formula_items:', err);
              }
            }
            
            // Récupérer les customizations depuis l'item (si disponibles)
            const itemCustomizations = item.customizations || {};
            
            const detailEntry = {
              commande_id: order.id,
              plat_id: formulaId, // ID de la formule elle-même
              quantite: quantity,
              prix_unitaire: totalFormulaPrice,
              customizations: {
                is_formula: true,
                formula_name: item.nom || 'Formule',
                formula_id: actualFormulaId || formulaId, // Stocker l'ID pour récupérer les formula_items
                formula_items_details: formulaItemsDetails, // IMPORTANT: Stocker les détails réels de la formule
                selected_drink: item.selected_drink ? {
                  id: item.selected_drink.id,
                  nom: item.selected_drink.nom || item.selected_drink.name
                } : null,
                // Inclure les customizations du burger (ingrédients retirés/ajoutés, viandes, sauces)
                selectedMeats: itemCustomizations.selectedMeats || [],
                selectedSauces: itemCustomizations.selectedSauces || [],
                removedIngredients: itemCustomizations.removedIngredients || [],
                addedIngredients: itemCustomizations.addedIngredients || []
              }
            };
            orderDetailsPayload.push(detailEntry);
            console.log(`✅ Détail formule créé avec plat_id: ${formulaId}`);
          } else {
            console.error('❌ Formule sans ID valide:', JSON.stringify(item, null, 2));
          }
        }

        // Ajouter la boisson sélectionnée si présente (dans les deux cas)
        if (item.selected_drink) {
          const drinkId = item.selected_drink.id || item.selected_drink.menu_id;
          if (drinkId) {
            // Les boissons de formule sont comprises dans le prix, donc prix = 0€
            const drinkPrice = 0;
            const drinkDetail = {
              commande_id: order.id,
              plat_id: drinkId,
              quantite: quantity,
              prix_unitaire: drinkPrice,
              customizations: {
                is_formula_drink: true,
                formula_name: item.nom || 'Formule',
                formula_id: item.id || item.formula_id,
                drink_name: item.selected_drink.nom || item.selected_drink.name
              }
            };
            orderDetailsPayload.push(drinkDetail);
            console.log(`🥤 Boisson ajoutée à la formule "${item.nom || 'Sans nom'}": ${item.selected_drink.nom || drinkId} (comprise dans la formule, prix: 0€)`);
          } else {
            console.warn('⚠️ Boisson sélectionnée mais sans ID:', item.selected_drink);
          }
        } else {
          console.log(`ℹ️ Formule "${item.nom}" sans boisson sélectionnée (peut être normal)`);
        }

        console.log(`✅ Total détails créés pour la formule "${item.nom || 'Formule'}": ${orderDetailsPayload.length}`);
        continue; // Passer au prochain item
      }

      // Pour les items normaux (non-formule)
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

      // Pour les combos, on doit trouver un plat_id valide du restaurant
      let platId = item.id;
      if (isCombo) {
        // Récupérer le premier article du menu du restaurant pour avoir un plat_id valide
        const { data: firstMenuItem } = await serviceClient
          .from('menus')
          .select('id')
          .eq('restaurant_id', restaurantId)
          .limit(1)
          .single();
        
        if (firstMenuItem) {
          platId = firstMenuItem.id;
          console.log(`🔧 Combo détecté: ${item.nom}, utilisation plat_id de référence: ${platId}`);
        } else {
          console.error('❌ Aucun article trouvé pour le restaurant, impossible de créer le combo');
          continue;
        }
      } else {
        if (!platId) {
          console.error('❌ Item sans ID:', item);
          continue;
        }
      }

      const detailEntry = {
        commande_id: order.id,
        plat_id: platId, // ID valide du menu (référence pour combos)
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

      // IMPORTANT: Ajouter la boisson sélectionnée pour les menus (non-formules) avec drink_options
      // Les formules sont déjà gérées plus haut, mais les menus normaux ont aussi besoin de leurs boissons
      // Détecter aussi les items avec drink_options même sans "menu" dans le nom
      // NOTE: Les boissons de menu sont COMPRISES dans le prix du menu, donc prix_unitaire = 0
      const hasDrinkOptions = item.drink_options && Array.isArray(item.drink_options) && item.drink_options.length > 0;
      if (!isFormula && item.selected_drink) {
        const drinkId = item.selected_drink.id || item.selected_drink.menu_id;
        if (drinkId) {
          // Les boissons de menu sont comprises, donc prix = 0€
          const drinkPrice = 0;
          const drinkDetail = {
            commande_id: order.id,
            plat_id: drinkId,
            quantite: quantity,
            prix_unitaire: drinkPrice,
            customizations: {
              is_menu_drink: true,
              menu_name: item.nom || 'Menu',
              menu_id: item.id,
              drink_name: item.selected_drink.nom || item.selected_drink.name
            }
          };
          orderDetailsPayload.push(drinkDetail);
          console.log(`🥤 Boisson ajoutée au menu "${item.nom || 'Sans nom'}": ${item.selected_drink.nom || drinkId} (comprise dans le menu, prix: 0€)`);
        } else {
          console.warn('⚠️ Boisson sélectionnée pour menu mais sans ID:', item.selected_drink);
        }
      } else if (!isFormula && hasDrinkOptions && !item.selected_drink) {
        console.warn(`⚠️ Menu "${item.nom || 'Sans nom'}" a des drink_options mais aucune boisson sélectionnée`);
      }
    }

    // Vérifier qu'on a des détails à insérer
    if (!orderDetailsPayload || orderDetailsPayload.length === 0) {
      console.error('❌ ERREUR CRITIQUE: Aucun détail de commande à insérer !');
      console.error('   Items reçus:', items?.length || 0);
      console.error('   Order ID:', order.id);
      return NextResponse.json(
        { error: 'Erreur: aucun détail de commande à insérer' },
        { status: 500 }
      );
    }

    console.log(`📋 Insertion de ${orderDetailsPayload.length} détails de commande pour commande ${order.id?.slice(0, 8)}`);
    
    // Vérifier qu'aucun plat_id n'est null
    const nullPlatIds = orderDetailsPayload.filter(d => !d.plat_id);
    if (nullPlatIds.length > 0) {
      console.error('❌ ERREUR CRITIQUE: Détails avec plat_id null détectés:', nullPlatIds.length);
      console.error('   Détails problématiques:', JSON.stringify(nullPlatIds, null, 2));
      return NextResponse.json(
        { 
          error: 'Erreur: certains détails ont un plat_id invalide (null)',
          details: 'Vérifiez les formules et combos'
        },
        { status: 500 }
      );
    }
    
    const { data: insertedDetails, error: detailsError } = await serviceClient
      .from('details_commande')
      .insert(orderDetailsPayload)
      .select();

    if (detailsError) {
      console.error('❌ ERREUR CRITIQUE - Erreur création détails commande:', detailsError);
      console.error('   Détails de l\'erreur:', JSON.stringify(detailsError, null, 2));
      console.error('   Payload tenté:', JSON.stringify(orderDetailsPayload, null, 2));
      console.error('   Commande ID:', order.id);
      
      // CRITIQUE: Ne pas continuer si les détails n'ont pas été créés
      // Car la commande sera inutilisable sans détails
      return NextResponse.json(
        { 
          error: 'Erreur lors de la création des détails de commande',
          details: detailsError.message,
          orderId: order.id
        },
        { status: 500 }
      );
    }

    if (!insertedDetails || insertedDetails.length !== orderDetailsPayload.length) {
      console.error('❌ ERREUR: Pas tous les détails ont été créés');
      console.error(`   Attendu: ${orderDetailsPayload.length}, Créé: ${insertedDetails?.length || 0}`);
      return NextResponse.json(
        { 
          error: 'Erreur: certains détails de commande n\'ont pas été créés',
          expected: orderDetailsPayload.length,
          created: insertedDetails?.length || 0
        },
        { status: 500 }
      );
    }

    console.log(`✅ ${insertedDetails.length} détails de commande créés avec succès pour commande ${order.id?.slice(0, 8)}`);

    // Marquer le gain "boisson offerte" comme utilisé si une boisson a été ajoutée
    if (freeDrinkAdded && userId) {
      const { data: freeDrinkWin } = await serviceClient
        .from('wheel_wins')
        .select('id, description')
        .eq('user_id', userId)
        .eq('prize_type', 'free_drink')
        .is('used_at', null)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (freeDrinkWin) {
        // Récupérer les infos utilisateur pour la notification
        let userEmail = null;
        let userName = null;
        const { data: userData } = await serviceClient
          .from('users')
          .select('email, nom, prenom')
          .eq('id', userId)
          .single();
        if (userData) {
          userEmail = userData.email;
          userName = `${userData.prenom || ''} ${userData.nom || ''}`.trim() || userEmail;
        }

        await serviceClient
          .from('wheel_wins')
          .update({
            used_at: new Date().toISOString(),
            used_in_order_id: order.id
          })
          .eq('id', freeDrinkWin.id);
        console.log('✅ Gain "boisson offerte" marqué comme utilisé');

        // Envoyer une notification admin pour informer qu'une boisson offerte a été utilisée
        try {
          const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cvneat.fr'}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: process.env.ADMIN_EMAIL || 'admin@cvneat.fr',
              subject: '🥤 Boisson offerte utilisée !',
              html: `
                <h2>Un client a utilisé son gain "boisson offerte"</h2>
                <p><strong>Client:</strong> ${userName || 'Inconnu'} (${userEmail || 'Email non disponible'})</p>
                <p><strong>Gain:</strong> ${freeDrinkWin.description || 'Boisson offerte'}</p>
                <p><strong>Commande:</strong> ${order.id}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
                <p><em>Une boisson a été automatiquement ajoutée à cette commande.</em></p>
              `,
              text: `
                Un client a utilisé son gain "boisson offerte"
                Client: ${userName || 'Inconnu'} (${userEmail || 'Email non disponible'})
                Gain: ${freeDrinkWin.description || 'Boisson offerte'}
                Commande: ${order.id}
                Date: ${new Date().toLocaleString('fr-FR')}
                Une boisson a été automatiquement ajoutée à cette commande.
              `
            })
          });

          if (notificationResponse.ok) {
            console.log('✅ Notification admin envoyée pour boisson offerte');
          } else {
            console.warn('⚠️ Erreur envoi notification admin (non bloquant)');
          }
        } catch (notifError) {
          console.warn('⚠️ Erreur notification admin (non bloquant):', notifError);
        }
      }
    }

    // IMPORTANT: Recalculer le sous-total réel depuis les détails créés pour inclure TOUT (boissons, suppléments, etc.)
    // Le total initial peut ne pas inclure les boissons des menus qui sont ajoutées séparément
    let calculatedSubtotal = 0;
    if (insertedDetails && insertedDetails.length > 0) {
      calculatedSubtotal = insertedDetails.reduce((sum, detail) => {
        const prixUnitaire = parseFloat(detail.prix_unitaire || 0) || 0;
        const quantite = parseFloat(detail.quantite || 1) || 0;
        return sum + (prixUnitaire * quantite);
      }, 0);
      // Arrondir à 2 décimales pour éviter les erreurs d'arrondi
      calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;
      console.log(`💰 Sous-total recalculé depuis détails: ${calculatedSubtotal}€ (initial: ${total}€)`);
    } else {
      // Fallback : utiliser le total initial si pas de détails (ne devrait pas arriver)
      calculatedSubtotal = parseFloat(total) || 0;
      console.warn('⚠️ Pas de détails pour recalculer, utilisation du total initial');
    }

    // Mettre à jour le total dans la commande si le sous-total recalculé est différent
    if (Math.abs(calculatedSubtotal - parseFloat(total || 0)) > 0.01) {
      console.log(`⚠️ Correction du total: ${total}€ → ${calculatedSubtotal}€`);
      const { error: updateError } = await serviceClient
        .from('commandes')
        .update({ total: calculatedSubtotal })
        .eq('id', order.id);
      
      if (updateError) {
        console.error('❌ Erreur mise à jour total:', updateError);
      } else {
        console.log('✅ Total corrigé dans la commande');
      }
    }

    console.log('🎯 RETOUR DE LA RÉPONSE - Commande créée avec statut:', order.statut);
    
    // Nettoyer les commandes expirées en arrière-plan (non bloquant)
    // Ne pas nettoyer la commande qui vient d'être créée
    cleanupExpiredOrders().catch(err => {
      console.warn('⚠️ Erreur nettoyage commandes expirées (non bloquant):', err);
    });
    
    const subtotalValue = calculatedSubtotal; // Utiliser le sous-total recalculé
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
        orderId: order.id,
        calculatedSubtotal: subtotalValue,
        originalSubtotal: parseFloat(total || 0)
      }
    });

  } catch (error) {
    console.error('❌ ERREUR GÉNÉRALE lors de la création de la commande:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Type:', error.name);
    console.error('❌ Message:', error.message);
    
    // Message d'erreur plus détaillé pour le client
    let errorMessage = 'Erreur lors de la création de la commande';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.code) {
      errorMessage = `Erreur ${error.code}: ${error.message || 'Erreur inconnue'}`;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
} 
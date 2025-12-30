import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    console.log('=== CRÉATION COMMANDE ADMIN ===');
    
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

    // Vérifier que l'utilisateur est admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé - Rôle admin requis' }, { status: 403 });
    }

    const body = await request.json();
    const { restaurantId, deliveryInfo, items, deliveryFee, totalAmount, customerInfo } = body;

    // Validation des données
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant non spécifié' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Aucun article dans la commande' }, { status: 400 });
    }

    if (!deliveryInfo || !deliveryInfo.address || !deliveryInfo.city || !deliveryInfo.postalCode) {
      return NextResponse.json({ error: 'Adresse de livraison incomplète' }, { status: 400 });
    }

    if (!customerInfo || !customerInfo.firstName || !customerInfo.lastName || !customerInfo.phone) {
      return NextResponse.json({ error: 'Informations client incomplètes' }, { status: 400 });
    }

    // Vérifier que le restaurant existe
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Calculer les commissions
    const restaurantCommissionRate = restaurant?.commission_rate 
      ? parseFloat(restaurant.commission_rate) / 100 
      : 0.20; // 20% par défaut
    const commissionGross = Math.round((totalAmount * restaurantCommissionRate) * 100) / 100;
    const restaurantPayout = Math.round((totalAmount * (1 - restaurantCommissionRate)) * 100) / 100;

    // Générer un code de sécurité
    const securityCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Construire l'adresse complète
    let adresseComplete = `${deliveryInfo.address}, ${deliveryInfo.city} ${deliveryInfo.postalCode}`;
    if (deliveryInfo.instructions && deliveryInfo.instructions.trim()) {
      adresseComplete += ` (Instructions: ${deliveryInfo.instructions.trim()})`;
    }

    // Créer la commande avec payment_status = 'paid' (mais sans stripe_payment_intent_id)
    const orderData = {
      restaurant_id: restaurantId,
      user_id: user.id, // L'admin est le user_id (ou on pourrait créer un user système)
      adresse_livraison: adresseComplete,
      ville_livraison: deliveryInfo.city || null,
      total: totalAmount,
      frais_livraison: parseFloat(deliveryFee || restaurant.frais_livraison || 0),
      statut: 'en_attente',
      payment_status: 'paid', // IMPORTANT: Marqué comme payé mais sans Stripe
      security_code: securityCode,
      delivery_requested_at: new Date().toISOString(),
      customer_first_name: customerInfo.firstName,
      customer_last_name: customerInfo.lastName,
      customer_phone: customerInfo.phone,
      customer_email: customerInfo.email || null,
      commission_rate: restaurantCommissionRate * 100,
      commission_amount: commissionGross,
      restaurant_payout: restaurantPayout,
      // Marquer que c'est une commande admin
      is_admin_order: true
    };

    console.log('📦 Création commande admin:', {
      restaurant_id: restaurantId,
      total: totalAmount,
      items_count: items.length
    });

    // Créer la commande
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .insert([orderData])
      .select('id, restaurant_id, total, frais_livraison, statut, adresse_livraison, created_at, payment_status')
      .single();

    if (orderError) {
      console.error('❌ Erreur création commande:', orderError);
      return NextResponse.json({ 
        error: 'Erreur lors de la création de la commande',
        details: orderError.message 
      }, { status: 500 });
    }

    console.log('✅ Commande créée:', order.id);

    // Créer les détails de commande
    const orderDetailsPayload = [];

    for (const item of items) {
      const quantity = parseInt(item.quantity || 1, 10);
      const itemPrice = parseFloat(item.prix || item.price || 0) || 0;
      const isFormula = item.is_formula === true;

      // Pour les formules, on utilise l'ID de la formule
      // Pour les items normaux, on utilise l'ID du menu
      let platId = item.id;

      if (isFormula) {
        // Vérifier que l'ID existe dans menus ou formulas
        const { data: menuCheck } = await supabaseAdmin
          .from('menus')
          .select('id')
          .eq('id', item.id)
          .maybeSingle();
        
        if (!menuCheck) {
          // Chercher dans formulas
          const { data: formulaCheck } = await supabaseAdmin
            .from('formulas')
            .select('id')
            .eq('id', item.id)
            .maybeSingle();
          
          if (!formulaCheck) {
            console.warn(`⚠️ ID de formule non trouvé: ${item.id}, utilisation quand même`);
          }
        }
      } else {
        // Pour les items normaux, vérifier qu'ils existent
        const { data: menuItem } = await supabaseAdmin
          .from('menus')
          .select('id')
          .eq('id', item.id)
          .eq('restaurant_id', restaurantId)
          .maybeSingle();
        
        if (!menuItem) {
          console.warn(`⚠️ Item menu non trouvé: ${item.id}, utilisation quand même`);
        }
      }

      const detailEntry = {
        commande_id: order.id,
        plat_id: platId,
        quantite: quantity,
        prix_unitaire: itemPrice
      };

      if (isFormula) {
        detailEntry.customizations = {
          is_formula: true,
          formula_name: item.nom || item.name || 'Formule'
        };
      }

      orderDetailsPayload.push(detailEntry);
    }

    // Insérer les détails
    if (orderDetailsPayload.length > 0) {
      const { error: detailsError } = await supabaseAdmin
        .from('details_commande')
        .insert(orderDetailsPayload);

      if (detailsError) {
        console.error('❌ Erreur création détails:', detailsError);
        // Ne pas faire échouer la commande, mais logger l'erreur
      } else {
        console.log(`✅ ${orderDetailsPayload.length} détails de commande créés`);
      }
    }

    return NextResponse.json({
      success: true,
      order: order,
      message: 'Commande créée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur API création commande admin:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


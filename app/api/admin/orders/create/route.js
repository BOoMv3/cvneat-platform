import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../../../lib/supabase';

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

    // IMPORTANT: Valider la distance de livraison AVANT de créer la commande
    const fullAddress = `${deliveryInfo.address}, ${deliveryInfo.postalCode} ${deliveryInfo.city}, France`;
    const deliveryValidationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cvneat.fr'}/api/delivery/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: fullAddress,
        deliveryAddress: fullAddress,
        restaurantId: restaurantId
      })
    });

    if (!deliveryValidationResponse.ok) {
      console.error('❌ Erreur validation livraison:', await deliveryValidationResponse.text());
      return NextResponse.json({ 
        error: 'Erreur lors de la validation de la zone de livraison' 
      }, { status: 400 });
    }

    const deliveryValidation = await deliveryValidationResponse.json();
    
    if (!deliveryValidation.livrable || !deliveryValidation.success) {
      console.error('❌ Livraison impossible:', deliveryValidation.message);
      return NextResponse.json({ 
        error: deliveryValidation.message || 'Livraison impossible à cette adresse' 
      }, { status: 400 });
    }

    // Note: La validation de distance est déjà effectuée par l'API /api/delivery/calculate
    // qui rejette automatiquement les distances > 8km (≈ 10km de route réelle)
    // Cette vérification supplémentaire n'est pas nécessaire mais conservée pour sécurité
    const distance = parseFloat(deliveryValidation.distance || 0);
    if (distance > 8) {
      console.error(`❌ Distance trop grande: ${distance.toFixed(1)}km`);
      return NextResponse.json({ 
        error: `Livraison impossible: ${distance.toFixed(1)}km (maximum 8km autorisé)` 
      }, { status: 400 });
    }

    // Utiliser les frais de livraison calculés par l'API au lieu de ceux fournis
    const calculatedDeliveryFee = parseFloat(deliveryValidation.frais_livraison || deliveryFee || 0);

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
      frais_livraison: calculatedDeliveryFee, // Utiliser les frais calculés par l'API de validation
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
      restaurant_payout: restaurantPayout
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
      const basePrice = parseFloat(item.prix || item.price || 0) || 0;
      const isFormula = item.is_formula === true;
      const isCombo = item.is_combo === true;

      // Calculer le prix total avec suppléments, viandes et sauces
      let supplementsPrice = 0;
      if (item.supplements && Array.isArray(item.supplements)) {
        supplementsPrice = item.supplements.reduce((sum, sup) => {
          return sum + (parseFloat(sup.prix || sup.price || 0) || 0);
        }, 0);
      }

      let meatsPrice = 0;
      if (item.customizations?.selectedMeats && Array.isArray(item.customizations.selectedMeats)) {
        meatsPrice = item.customizations.selectedMeats.reduce((sum, meat) => {
          return sum + (parseFloat(meat.prix || meat.price || 0) || 0);
        }, 0);
      }

      let saucesPrice = 0;
      if (item.customizations?.selectedSauces && Array.isArray(item.customizations.selectedSauces)) {
        saucesPrice = item.customizations.selectedSauces.reduce((sum, sauce) => {
          return sum + (parseFloat(sauce.prix || sauce.price || 0) || 0);
        }, 0);
      }

      const prixUnitaireTotal = basePrice + supplementsPrice + meatsPrice + saucesPrice;
      
      // Pour les combos, utiliser l'ID du combo (mais vérifier qu'il existe dans menu_combos)
      if (isCombo && item.comboId) {
        const { data: comboCheck } = await supabaseAdmin
          .from('menu_combos')
          .select('id')
          .eq('id', item.comboId)
          .maybeSingle();
        
        if (!comboCheck) {
          console.warn(`⚠️ ID de combo non trouvé: ${item.comboId}, utilisation quand même`);
        }
      }

      // Pour les combos, on utilise l'ID du combo (mais on ne peut pas l'utiliser comme plat_id car ce n'est pas dans la table menus)
      // On va utiliser un ID générique ou le premier item du combo
      // Pour les formules, on utilise l'ID de la formule
      // Pour les items normaux, on utilise l'ID du menu
      let platId = item.id;

      // Pour les combos, on doit trouver un plat_id valide (utiliser le premier item du combo si possible)
      // Sinon, on peut créer un menu générique ou utiliser un ID spécial
      // Pour l'instant, on utilise l'ID du combo comme plat_id (mais cela nécessitera une gestion spéciale dans l'affichage)
      if (isCombo) {
        // Pour les combos, on peut utiliser l'ID du combo directement
        // L'important est de stocker les informations dans customizations.combo
        platId = item.comboId || item.id;
      } else if (isFormula) {
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
        prix_unitaire: prixUnitaireTotal // Prix avec tous les suppléments/viandes/sauces
      };

      // Ajouter les suppléments si présents
      if (item.supplements && Array.isArray(item.supplements) && item.supplements.length > 0) {
        detailEntry.supplements = item.supplements.map(sup => ({
          id: sup.id,
          nom: sup.nom || sup.name,
          prix: parseFloat(sup.prix || sup.price || 0) || 0
        }));
      }

      // Préparer les customizations
      const customizations = {};
      
      // Gérer les menus composés (combos)
      if (item.is_combo === true && item.comboId) {
        customizations.combo = {
          comboId: item.comboId,
          comboName: item.comboName || item.name || 'Menu composé',
          details: item.comboDetails || []
        };
      } else if (isFormula) {
        customizations.is_formula = true;
        customizations.formula_name = item.nom || item.name || 'Formule';
      }

      // Ajouter les viandes et sauces aux customizations
      if (item.customizations) {
        if (item.customizations.selectedMeats && Array.isArray(item.customizations.selectedMeats) && item.customizations.selectedMeats.length > 0) {
          customizations.selectedMeats = item.customizations.selectedMeats;
        }
        if (item.customizations.selectedSauces && Array.isArray(item.customizations.selectedSauces) && item.customizations.selectedSauces.length > 0) {
          customizations.selectedSauces = item.customizations.selectedSauces;
        }
      }

      // Ajouter les customizations si elles existent
      if (Object.keys(customizations).length > 0) {
        detailEntry.customizations = customizations;
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


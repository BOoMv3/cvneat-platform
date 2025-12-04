import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquant');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// GET - Vérifier et corriger les totaux des commandes
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const fix = searchParams.get('fix') === 'true';

    if (orderId) {
      // Vérifier une commande spécifique
      return await checkAndFixOrder(orderId, fix);
    } else {
      // Vérifier toutes les commandes récentes
      return await checkAllOrders(fix);
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function checkAndFixOrder(orderId, fix = false) {
  // Récupérer la commande
  const { data: order, error: orderError } = await supabaseAdmin
    .from('commandes')
    .select('id, total, frais_livraison')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
  }

  // Récupérer les détails
  const { data: details, error: detailsError } = await supabaseAdmin
    .from('details_commande')
    .select('id, prix_unitaire, quantite, menus(nom)')
    .eq('commande_id', orderId);

  if (detailsError) {
    return NextResponse.json({ error: 'Erreur récupération détails' }, { status: 500 });
  }

  // Calculer le total réel
  const calculatedTotal = (details || []).reduce((sum, detail) => {
    const prixUnitaire = parseFloat(detail.prix_unitaire || 0);
    const quantite = parseFloat(detail.quantite || 1);
    return sum + (prixUnitaire * quantite);
  }, 0);

  const storedTotal = parseFloat(order.total || 0);
  const difference = Math.abs(calculatedTotal - storedTotal);

  const result = {
    orderId,
    storedTotal: storedTotal.toFixed(2),
    calculatedTotal: calculatedTotal.toFixed(2),
    difference: difference.toFixed(2),
    needsFix: difference > 0.01,
    details: (details || []).map(d => ({
      nom: d.menus?.nom || 'Article',
      prix_unitaire: parseFloat(d.prix_unitaire || 0).toFixed(2),
      quantite: d.quantite,
      total: (parseFloat(d.prix_unitaire || 0) * parseFloat(d.quantite || 1)).toFixed(2)
    }))
  };

  // Corriger si demandé et si nécessaire
  if (fix && result.needsFix) {
    const { error: updateError } = await supabaseAdmin
      .from('commandes')
      .update({ total: calculatedTotal })
      .eq('id', orderId);

    if (updateError) {
      return NextResponse.json({ 
        ...result, 
        error: 'Erreur lors de la correction',
        updateError: updateError.message 
      }, { status: 500 });
    }

    result.fixed = true;
    result.newTotal = calculatedTotal.toFixed(2);
  }

  return NextResponse.json(result);
}

async function checkAllOrders(fix = false) {
  // Récupérer les commandes récentes (30 derniers jours)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('commandes')
    .select('id, total, created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (ordersError) {
    return NextResponse.json({ error: 'Erreur récupération commandes' }, { status: 500 });
  }

  const results = [];
  let fixedCount = 0;

  for (const order of orders || []) {
    const { data: details } = await supabaseAdmin
      .from('details_commande')
      .select('prix_unitaire, quantite')
      .eq('commande_id', order.id);

    const calculatedTotal = (details || []).reduce((sum, detail) => {
      return sum + (parseFloat(detail.prix_unitaire || 0) * parseFloat(detail.quantite || 1));
    }, 0);

    const storedTotal = parseFloat(order.total || 0);
    const difference = Math.abs(calculatedTotal - storedTotal);

    if (difference > 0.01) {
      const result = {
        orderId: order.id,
        storedTotal: storedTotal.toFixed(2),
        calculatedTotal: calculatedTotal.toFixed(2),
        difference: difference.toFixed(2)
      };

      if (fix) {
        const { error: updateError } = await supabaseAdmin
          .from('commandes')
          .update({ total: calculatedTotal })
          .eq('id', order.id);

        if (!updateError) {
          result.fixed = true;
          fixedCount++;
        } else {
          result.error = updateError.message;
        }
      }

      results.push(result);
    }
  }

  return NextResponse.json({
    checked: orders?.length || 0,
    incorrect: results.length,
    fixed: fixedCount,
    orders: results
  });
}


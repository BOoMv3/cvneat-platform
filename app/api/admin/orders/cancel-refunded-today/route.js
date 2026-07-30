import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminViewerRole, isAdminWriterRole } from '@/lib/admin-viewer';

// Créer un client admin pour bypasser RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fonction pour vérifier le token et le rôle admin
const verifyAdminToken = async (request) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Non autorisé', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return { error: 'Token invalide', status: 401 };
  }

  // Vérifier le rôle admin
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || !isAdminWriterRole(userData.role)) {
    return { error: 'Accès refusé - Admin requis', status: 403 };
  }

  return { userId: user.id };
};

// POST /api/admin/orders/cancel-refunded-today - Annuler toutes les commandes remboursées d'aujourd'hui
export async function POST(request) {
  try {
    // Vérifier l'authentification admin
    const auth = await verifyAdminToken(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Récupérer la date d'aujourd'hui au format ISO (début de journée)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    
    // Récupérer la date de demain (fin de journée)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = tomorrow.toISOString();

    console.log('🔍 Recherche des commandes remboursées d\'aujourd\'hui:', {
      todayStart,
      tomorrowStart
    });

    // 1. Trouver toutes les commandes remboursées d'aujourd'hui qui ne sont pas encore annulées
    const { data: refundedOrders, error: findError } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, payment_status, total, frais_livraison, user_id, created_at')
      .eq('payment_status', 'refunded')
      .gte('created_at', todayStart)
      .lt('created_at', tomorrowStart)
      .neq('statut', 'annulee');

    if (findError) {
      console.error('❌ Erreur recherche commandes remboursées:', findError);
      return NextResponse.json({
        error: 'Erreur lors de la recherche des commandes',
        details: findError.message
      }, { status: 500 });
    }

    if (!refundedOrders || refundedOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucune commande remboursée d\'aujourd\'hui à annuler',
        count: 0,
        orders: []
      });
    }

    console.log(`✅ ${refundedOrders.length} commande(s) remboursée(s) trouvée(s) d'aujourd'hui`);

    // 2. Annuler toutes ces commandes
    const orderIds = refundedOrders.map(order => order.id);
    
    const { data: updatedOrders, error: updateError } = await supabaseAdmin
      .from('commandes')
      .update({
        statut: 'annulee',
        updated_at: new Date().toISOString()
      })
      .in('id', orderIds)
      .select('id, statut, payment_status');

    if (updateError) {
      console.error('❌ Erreur mise à jour commandes:', updateError);
      return NextResponse.json({
        error: 'Erreur lors de l\'annulation des commandes',
        details: updateError.message
      }, { status: 500 });
    }

    // 3. Créer des notifications pour les clients concernés
    const notifications = refundedOrders
      .filter(order => order.user_id)
      .map(order => ({
        user_id: order.user_id,
        type: 'order_cancelled',
        title: 'Commande annulée',
        message: `Votre commande #${order.id.slice(0, 8)} a été annulée car elle a été remboursée.`,
        data: {
          order_id: order.id,
          reason: 'Commande remboursée et annulée automatiquement'
        },
        read: false,
        created_at: new Date().toISOString()
      }));

    if (notifications.length > 0) {
      try {
        await supabaseAdmin
          .from('notifications')
          .insert(notifications);
        console.log(`✅ ${notifications.length} notification(s) créée(s) pour les clients`);
      } catch (notificationError) {
        console.warn('⚠️ Erreur création notifications (non bloquant):', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${refundedOrders.length} commande(s) remboursée(s) d'aujourd'hui annulée(s) avec succès`,
      count: refundedOrders.length,
      orders: updatedOrders || refundedOrders.map(order => ({
        id: order.id,
        statut: 'annulee',
        payment_status: order.payment_status
      }))
    });

  } catch (error) {
    console.error('❌ Erreur API cancel-refunded-today:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'annulation des commandes remboursées', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/admin/orders/cancel-refunded-today - Vérifier les commandes remboursées d'aujourd'hui
export async function GET(request) {
  try {
    // Vérifier l'authentification admin
    const auth = await verifyAdminToken(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Récupérer la date d'aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = tomorrow.toISOString();

    // Récupérer les commandes remboursées d'aujourd'hui
    const { data: refundedOrders, error } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, payment_status, total, frais_livraison, stripe_refund_id, refund_amount, refunded_at, created_at, updated_at')
      .eq('payment_status', 'refunded')
      .gte('created_at', todayStart)
      .lt('created_at', tomorrowStart)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur recherche commandes remboursées:', error);
      return NextResponse.json({
        error: 'Erreur lors de la recherche des commandes',
        details: error.message
      }, { status: 500 });
    }

    const notCancelled = (refundedOrders || []).filter(order => order.statut !== 'annulee');

    return NextResponse.json({
      success: true,
      total_refunded: refundedOrders?.length || 0,
      not_cancelled: notCancelled.length,
      orders: refundedOrders || []
    });

  } catch (error) {
    console.error('❌ Erreur API GET cancel-refunded-today:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}


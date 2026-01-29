import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Email',
};

export async function OPTIONS() {
  // Nécessaire pour WKWebView/Capacitor: les requêtes avec Authorization déclenchent un preflight
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request, { params }) {
  try {
    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json({ error: 'ID de commande manquant' }, { status: 400, headers: corsHeaders });
    }

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: corsHeaders });
    }

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vérifier que l'utilisateur est un livreur (par ID pour plus de fiabilité)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const normalizeRole = (r) => (r || '').toString().trim().toLowerCase();
    const role = normalizeRole(userData?.role);
    if (userError || !userData || (role !== 'delivery' && role !== 'livreur')) {
      return NextResponse.json(
        { error: 'Accès refusé - Rôle livreur requis' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Vérifier que la commande existe et appartient à ce livreur
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, livreur_id, payment_status, user_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404, headers: corsHeaders });
    }

    // VÉRIFICATION CRITIQUE: Bloquer si la commande est déjà annulée ou remboursée
    if (order.statut === 'annulee' || order.payment_status === 'refunded') {
      return NextResponse.json({ 
        error: 'Cette commande a été annulée ou remboursée et n\'est plus active',
        statut: order.statut,
        payment_status: order.payment_status
      }, { status: 400, headers: corsHeaders });
    }

    if (order.livreur_id !== user.id) {
      return NextResponse.json({ error: 'Cette commande ne vous appartient pas' }, { status: 403, headers: corsHeaders });
    }

    // Vérifier que la commande est en livraison ou prête
    if (order.statut !== 'en_livraison' && order.statut !== 'pret_a_livrer') {
      return NextResponse.json({ 
        error: `La commande doit être en livraison ou prête à livrer. Statut actuel: ${order.statut}` 
      }, { status: 400, headers: corsHeaders });
    }

    // Mettre à jour la commande avec picked_up_at
    // + si la commande était "pret_a_livrer", on la passe en "en_livraison"
    // (étape "commande remise au livreur / livreur en route")
    const updatePayload = {
      picked_up_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (order.statut === 'pret_a_livrer') {
      updatePayload.statut = 'en_livraison';
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('commandes')
      .update(updatePayload)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour picked_up_at:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500, headers: corsHeaders });
    }

    // Envoyer une notification push au client
    try {
      if (updatedOrder?.user_id) {
        const pushTitle = 'Livreur en route 🚚';
        const pushBody = `Votre commande #${orderId.slice(0, 8)} a été récupérée et arrive bientôt.`;

        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cvneat.fr'}/api/notifications/send-push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: updatedOrder.user_id,
            title: pushTitle,
            body: pushBody,
            data: {
              type: 'order_status_update',
              orderId,
              status: updatedOrder.statut || order.statut,
              url: `/orders/${orderId}`,
            },
          }),
        });
      }
    } catch (notificationError) {
      console.warn('⚠️ Erreur notification client:', notificationError);
      // Ne pas faire échouer la requête si la notification échoue
    }

    return NextResponse.json({
      success: true,
      message: 'Commande marquée comme récupérée',
      order: updatedOrder
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Erreur API picked-up:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500, headers: corsHeaders });
  }
}


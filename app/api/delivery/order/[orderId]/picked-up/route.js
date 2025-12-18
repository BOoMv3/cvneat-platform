import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json({ error: 'ID de commande manquant' }, { status: 400 });
    }

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un livreur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vérifier que la commande existe et appartient à ce livreur
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, livreur_id, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // VÉRIFICATION CRITIQUE: Bloquer si la commande est déjà annulée ou remboursée
    if (order.statut === 'annulee' || order.payment_status === 'refunded') {
      return NextResponse.json({ 
        error: 'Cette commande a été annulée ou remboursée et n\'est plus active',
        statut: order.statut,
        payment_status: order.payment_status
      }, { status: 400 });
    }

    if (order.livreur_id !== user.id) {
      return NextResponse.json({ error: 'Cette commande ne vous appartient pas' }, { status: 403 });
    }

    // Vérifier que la commande est en livraison ou prête
    if (order.statut !== 'en_livraison' && order.statut !== 'pret_a_livrer') {
      return NextResponse.json({ 
        error: `La commande doit être en livraison ou prête à livrer. Statut actuel: ${order.statut}` 
      }, { status: 400 });
    }

    // Mettre à jour la commande avec picked_up_at
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('commandes')
      .update({
        picked_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour picked_up_at:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    // Envoyer une notification au client (optionnel)
    try {
      // Récupérer les informations du client
      const { data: customerData } = await supabaseAdmin
        .from('commandes')
        .select('user_id, users:user_id(email)')
        .eq('id', orderId)
        .single();

      // TODO: Envoyer une notification push/email au client
      // Vous pouvez utiliser votre système de notifications existant ici
    } catch (notificationError) {
      console.warn('⚠️ Erreur notification client:', notificationError);
      // Ne pas faire échouer la requête si la notification échoue
    }

    return NextResponse.json({
      success: true,
      message: 'Commande marquée comme récupérée',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Erreur API picked-up:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


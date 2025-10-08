import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function POST(request, { params }) {
  try {
    const { orderId } = params;
    console.log('🔍 API accept-order appelée pour commande:', orderId);
    
    // Récupérer le token depuis les cookies ou headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un livreur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vérifier que la commande existe et est disponible
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.log('❌ Commande introuvable:', orderId, orderError);
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    console.log('✅ Commande trouvée:', {
      id: order.id,
      statut: order.statut,
      livreur_id: order.livreur_id,
      restaurant_id: order.restaurant_id
    });

    // Vérifier que la commande n'est pas déjà acceptée par un autre livreur
    if (order.livreur_id && order.livreur_id !== user.id) {
      return NextResponse.json({ error: 'Commande déjà acceptée par un autre livreur' }, { status: 409 });
    }

    // Vérifier que la commande est dans un statut acceptable
    if (!['en_attente', 'acceptee', 'pret_a_livrer', 'en_preparation'].includes(order.statut)) {
      console.log('❌ Statut commande non acceptable:', order.statut);
      return NextResponse.json({ 
        error: 'Commande non disponible', 
        details: `Statut actuel: ${order.statut}` 
      }, { status: 400 });
    }

    // Accepter la commande
    console.log('📤 Mise à jour commande:', {
      orderId,
      livreur_id: user.id,
      statut: 'en_livraison'
    });
    
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('commandes')
      .update({
        livreur_id: user.id,
        statut: 'en_livraison', // Le livreur accepte, statut passe en livraison
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur acceptation commande:', updateError);
      console.error('❌ Détails erreur:', JSON.stringify(updateError, null, 2));
      return NextResponse.json({ error: 'Erreur acceptation commande' }, { status: 500 });
    }

    console.log('✅ Commande acceptée par livreur:', user.email);
    console.log('✅ Commande mise à jour:', {
      id: updatedOrder.id,
      statut: updatedOrder.statut,
      livreur_id: updatedOrder.livreur_id
    });
    
    return NextResponse.json({ success: true, message: 'Commande acceptée avec succès' });
  } catch (error) {
    console.error('❌ Erreur API accept-order:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
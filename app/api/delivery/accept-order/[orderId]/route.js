import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

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

    // Vérifier que la commande existe et est disponible
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.log('❌ Commande introuvable:', orderId, orderError);
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    console.log('✅ Commande trouvée:', {
      id: order.id,
      status: order.status,
      delivery_id: order.delivery_id,
      restaurant_id: order.restaurant_id
    });

    // Vérifier que la commande n'est pas déjà acceptée par un autre livreur
    if (order.delivery_id && order.delivery_id !== user.id) {
      return NextResponse.json({ error: 'Commande déjà acceptée par un autre livreur' }, { status: 409 });
    }

    // Vérifier que la commande est dans un statut acceptable
    if (!['pending', 'accepted', 'ready'].includes(order.status)) {
      console.log('❌ Statut commande non acceptable:', order.status);
      return NextResponse.json({ 
        error: 'Commande non disponible', 
        details: `Statut actuel: ${order.status}` 
      }, { status: 400 });
    }

    // Accepter la commande
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        delivery_id: user.id,
        status: 'accepted', // Le livreur accepte, mais la commande reste visible
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ Erreur acceptation commande:', updateError);
      return NextResponse.json({ error: 'Erreur acceptation commande' }, { status: 500 });
    }

    console.log('✅ Commande acceptée par livreur:', user.email);
    return NextResponse.json({ success: true, message: 'Commande acceptée avec succès' });
  } catch (error) {
    console.error('❌ Erreur API accept-order:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
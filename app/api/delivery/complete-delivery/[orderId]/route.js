import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function POST(request, { params }) {
  try {
    const { orderId } = params;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un livreur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.role.includes('delivery')) {
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    // Récupérer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('delivery_id', user.id)
      .eq('status', 'en_livraison')
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée ou non autorisée' },
        { status: 404 }
      );
    }

    // Calculer les gains du livreur (frais de livraison)
    const deliveryFee = parseFloat(order.delivery_fee || 0);
    const deliveryTime = Math.floor((Date.now() - new Date(order.accepted_at).getTime()) / 60000); // en minutes

    // Mettre à jour la commande
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'livree',
        delivered_at: new Date().toISOString(),
        delivery_time: deliveryTime
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Erreur mise à jour commande:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la finalisation de la livraison' },
        { status: 500 }
      );
    }

    // Enregistrer les gains du livreur
    const { error: earningsError } = await supabase
      .from('delivery_earnings')
      .insert({
        delivery_id: user.id,
        order_id: orderId,
        amount: deliveryFee,
        delivery_time: deliveryTime,
        completed_at: new Date().toISOString()
      });

    if (earningsError) {
      console.error('Erreur enregistrement gains:', earningsError);
      // Ne pas échouer si l'enregistrement des gains échoue
    }

    // Envoyer une notification au restaurant
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: order.restaurant_id,
          type: 'delivery_completed',
          title: 'Livraison terminée',
          message: `La commande #${orderId} a été livrée avec succès`,
          data: { orderId, deliveryTime }
        });
    } catch (notificationError) {
      console.error('Erreur notification restaurant:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Livraison finalisée avec succès',
      orderId: orderId,
      deliveryFee: deliveryFee,
      deliveryTime: deliveryTime
    });

  } catch (error) {
    console.error('Erreur API finalisation livraison:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 
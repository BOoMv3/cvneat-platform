import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabase';

export async function PUT(request, { params }) {
  try {
    const { orderId } = params;
    const { status } = await request.json();
    const deliveryId = 'current-user-id'; // À remplacer par l'ID réel

    // Vérifier que la commande appartient au livreur
    const { data: order, error: checkError } = await supabase
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .eq('livreur_id', deliveryId)
      .single();

    if (checkError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée ou non autorisée' },
        { status: 403 }
      );
    }

    // Mettre à jour le statut
    const { error: updateError } = await supabase
      .from('commandes')
      .update({
        statut: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Erreur mise à jour statut:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du statut' },
        { status: 500 }
      );
    }

    // Si la livraison est terminée, mettre à jour les stats du livreur
    if (status === 'livree') {
      const { data: currentStats } = await supabase
        .from('delivery_stats')
        .select('*')
        .eq('delivery_id', deliveryId)
        .single();

      if (currentStats) {
        await supabase
          .from('delivery_stats')
          .update({
            total_deliveries: (currentStats.total_deliveries || 0) + 1,
            total_earnings: (currentStats.total_earnings || 0) + (order.frais_livraison || 0)
          })
          .eq('delivery_id', deliveryId);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Statut mis à jour avec succès',
      orderId: orderId,
      status: status
    });
  } catch (error) {
    console.error('Erreur API mise à jour statut:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 
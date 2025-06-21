import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const { orderId, rating, comment } = await request.json();

    if (!orderId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'ID commande et note (1-5) requis' },
        { status: 400 }
      );
    }

    // Vérifier que la commande existe et est livrée
    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .eq('statut', 'livree')
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée ou non livrée' },
        { status: 404 }
      );
    }

    // Mettre à jour la commande avec la note et le commentaire
    const { error: updateError } = await supabase
      .from('commandes')
      .update({
        note_livreur: rating,
        commentaire_livreur: comment || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Erreur mise à jour note:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde de la note' },
        { status: 500 }
      );
    }

    // Recalculer la note moyenne du livreur
    await updateDeliveryRating(order.livreur_id);

    return NextResponse.json({
      success: true,
      message: 'Note enregistrée avec succès',
      rating: rating
    });
  } catch (error) {
    console.error('Erreur API notation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

async function updateDeliveryRating(deliveryId) {
  try {
    // Calculer la nouvelle note moyenne
    const { data: ratings, error } = await supabase
      .from('commandes')
      .select('note_livreur')
      .eq('livreur_id', deliveryId)
      .not('note_livreur', 'is', null);

    if (error) {
      console.error('Erreur calcul note moyenne:', error);
      return;
    }

    if (ratings && ratings.length > 0) {
      const totalRating = ratings.reduce((sum, order) => sum + order.note_livreur, 0);
      const averageRating = totalRating / ratings.length;

      // Mettre à jour la note moyenne dans delivery_stats
      await supabase
        .from('delivery_stats')
        .update({
          rating: Math.round(averageRating * 10) / 10, // Arrondir à 1 décimale
          updated_at: new Date().toISOString()
        })
        .eq('delivery_id', deliveryId);
    }
  } catch (error) {
    console.error('Erreur mise à jour note moyenne:', error);
  }
} 
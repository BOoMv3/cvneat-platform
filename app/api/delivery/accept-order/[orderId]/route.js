import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function POST(request, { params }) {
  try {
    const { orderId } = params;
    const deliveryId = 'current-user-id'; // À remplacer par l'ID réel

    // Vérifier que la commande est disponible
    const { data: order, error: checkError } = await supabase
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .eq('statut', 'pret_a_livrer')
      .is('livreur_id', null)
      .single();

    if (checkError || !order) {
      return NextResponse.json(
        { error: 'Commande non disponible ou déjà prise' },
        { status: 400 }
      );
    }

    // Assigner la commande au livreur
    const { error: updateError } = await supabase
      .from('commandes')
      .update({
        livreur_id: deliveryId,
        statut: 'en_livraison',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Erreur assignation commande:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'acceptation de la commande' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Commande acceptée avec succès',
      orderId: orderId
    });
  } catch (error) {
    console.error('Erreur API accepter commande:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 
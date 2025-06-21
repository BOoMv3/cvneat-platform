import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function PUT(request) {
  try {
    const { is_available } = await request.json();
    const deliveryId = 'current-user-id'; // À remplacer par l'ID réel

    // Mettre à jour la disponibilité
    const { error } = await supabase
      .from('delivery_stats')
      .update({
        is_available: is_available,
        updated_at: new Date().toISOString()
      })
      .eq('delivery_id', deliveryId);

    if (error) {
      console.error('Erreur mise à jour disponibilité:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la disponibilité' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Disponibilité mise à jour avec succès',
      is_available: is_available
    });
  } catch (error) {
    console.error('Erreur API disponibilité:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 
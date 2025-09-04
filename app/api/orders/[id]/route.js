import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET /api/orders/[id] - Récupérer une commande spécifique
export async function GET(request, { params }) {
  try {
    const { id } = params;
    console.log('=== RÉCUPÉRATION COMMANDE ===');
    console.log('ID de commande demandé:', id);
    console.log('Type de l\'ID:', typeof id);
    
    // D'abord, essayons de récupérer la commande sans jointure
    console.log('Tentative de récupération de la commande sans jointure...');
    const { data: orderBasic, error: basicError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (basicError) {
      console.error('Erreur lors de la récupération basique:', basicError);
      return NextResponse.json(
        { error: `Commande non trouvée: ${basicError.message}` },
        { status: 404 }
      );
    }

    if (!orderBasic) {
      console.log('Commande non trouvée avec ID:', id);
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    console.log('Commande trouvée:', orderBasic);
    
    // Maintenant, essayons avec la jointure
    console.log('Tentative de récupération avec jointure...');
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurants (
          id,
          name,
          description,
          image_url
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erreur lors de la récupération avec jointure:', error);
      // Si la jointure échoue, retournons au moins la commande de base
      console.log('Retour de la commande sans jointure');
      return NextResponse.json(orderBasic);
    }

    if (!order) {
      console.log('Commande non trouvée avec jointure');
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    console.log('Commande récupérée avec succès:', order);
    return NextResponse.json(order);
  } catch (error) {
    console.error('Erreur générale lors de la récupération de la commande:', error);
    return NextResponse.json(
      { error: `Erreur lors de la récupération de la commande: ${error.message}` },
      { status: 500 }
    );
  }
}

// PUT /api/orders/[id] - Mettre à jour le statut d'une commande (acceptation/refus)
export async function PUT(request, { params }) {
  try {
    console.log('=== MISE À JOUR STATUT COMMANDE ===');
    const { id } = params;
    const { status, reason, preparation_time } = await request.json();
    
    console.log('ID commande:', id);
    console.log('Nouveau statut:', status);
    console.log('Raison:', reason);
    console.log('Temps préparation:', preparation_time);

    // Validation du statut
    const validStatuses = ['accepted', 'rejected', 'preparing', 'ready', 'delivered'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    // Mettre à jour la commande
    const updateData = {
      status: status,
      status_reason: reason || null,
      updated_at: new Date().toISOString()
    };
    
    // Ajouter le temps de préparation si fourni
    if (preparation_time !== undefined && preparation_time !== null) {
      updateData.preparation_time = preparation_time;
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur lors de la mise à jour de la commande:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la commande' },
        { status: 500 }
      );
    }

    console.log('✅ Commande mise à jour avec succès:', order);
    return NextResponse.json({
      message: `Commande ${status === 'accepted' ? 'acceptée' : status === 'rejected' ? 'refusée' : 'mise à jour'}`,
      order: order
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la commande:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la commande' },
      { status: 500 }
    );
  }
} 
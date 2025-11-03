import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Créer un client admin pour bypasser RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request, { params }) {
  try {
    const { id } = params;

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token d\'authentification requis' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Récupérer la commande
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // Vérifier que la commande appartient à l'utilisateur
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Vous n\'êtes pas autorisé à annuler cette commande' }, { status: 403 });
    }

    // Vérifier que la commande peut être annulée (seulement en attente ou en préparation)
    if (order.statut !== 'en_attente' && order.statut !== 'en_preparation') {
      return NextResponse.json({ 
        error: 'Cette commande ne peut plus être annulée', 
        current_status: order.statut 
      }, { status: 400 });
    }

    // Vérifier qu'aucun livreur n'a accepté la commande
    if (order.livreur_id) {
      return NextResponse.json({ 
        error: 'Cette commande a déjà été acceptée par un livreur et ne peut plus être annulée',
        delivery_id: order.livreur_id
      }, { status: 400 });
    }

    // Annuler la commande
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('commandes')
      .update({
        statut: 'annulee',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur lors de l\'annulation:', updateError);
      return NextResponse.json({ error: 'Erreur lors de l\'annulation de la commande' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Commande annulée avec succès',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Erreur générale lors de l\'annulation:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'annulation de la commande' }, { status: 500 });
  }
}


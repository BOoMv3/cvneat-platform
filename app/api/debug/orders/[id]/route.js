import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    console.log('=== DEBUG COMMANDE SANS AUTH ===');
    console.log('ID demandé:', id);

    // Récupérer la commande
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Erreur récupération commande:', error);
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    if (!order) {
      console.log('❌ Aucune commande trouvée pour l\'ID:', id);
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    console.log('✅ Commande trouvée:', order);

    return NextResponse.json({
      success: true,
      order,
      message: 'Commande récupérée sans authentification'
    });
  } catch (error) {
    console.error('❌ Erreur API debug:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

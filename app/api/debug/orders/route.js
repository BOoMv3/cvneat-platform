import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET /api/debug/orders - Voir toutes les commandes (pour debug)
export async function GET(request) {
  try {
    console.log('=== DEBUG: RÉCUPÉRATION TOUTES LES COMMANDES ===');
    
    // Récupérer toutes les commandes sans filtre
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération commandes:', error);
      return NextResponse.json({ error: 'Erreur récupération commandes' }, { status: 500 });
    }

    console.log('✅ Commandes trouvées:', orders?.length || 0);
    console.log('Commandes:', orders);
    
    return NextResponse.json(orders || []);
  } catch (error) {
    console.error('❌ Erreur API debug:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

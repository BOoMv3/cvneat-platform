import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    console.log('=== DEBUG TOUTES LES COMMANDES ===');

    // Récupérer toutes les commandes
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération commandes:', error);
      return NextResponse.json({ error: 'Erreur récupération commandes' }, { status: 500 });
    }

    console.log('✅ Commandes trouvées:', orders?.length || 0);

    return NextResponse.json({
      success: true,
      orders: orders || [],
      count: orders?.length || 0,
      message: 'Toutes les commandes récupérées'
    });
  } catch (error) {
    console.error('❌ Erreur API debug:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
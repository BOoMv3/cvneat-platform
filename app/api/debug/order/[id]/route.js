import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    console.log('=== DEBUG COMMANDE ===');
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

    // Récupérer tous les utilisateurs pour debug
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, nom, prenom')
      .eq('email', 'client.test@example.com');

    if (usersError) {
      console.error('❌ Erreur récupération utilisateurs:', usersError);
    }

    console.log('👥 Utilisateurs trouvés:', users);

    return NextResponse.json({
      order,
      users,
      debug: {
        order_customer_name: order.customer_name,
        users_found: users?.length || 0,
        first_user: users?.[0] || null,
        full_name_comparison: users?.[0] ? `${users[0].prenom} ${users[0].nom}` : 'N/A'
      }
    });
  } catch (error) {
    console.error('❌ Erreur API debug:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

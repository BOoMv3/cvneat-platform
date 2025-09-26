import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    console.log('=== RÉCUPÉRATION COMMANDE PAR ID ===');
    console.log('ID demandé:', id);

    // Récupérer la commande directement (sans authentification pour le test)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: order, error } = await supabase
      .from('commandes')
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

    console.log('✅ Commande trouvée:', order.id);
    return NextResponse.json(order);
  } catch (error) {
    console.error('❌ Erreur API commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    console.log('=== MISE À JOUR COMMANDE ===');
    console.log('ID commande:', id);
    console.log('Données reçues:', body);

    // Mettre à jour la commande
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('commandes')
      .update({
        statut: body.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur mise à jour:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    console.log('✅ Commande mise à jour:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Erreur API mise à jour:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
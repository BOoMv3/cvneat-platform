import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function POST(request, { params }) {
  try {
    const { orderId } = params;
    console.log('🔍 API complete-delivery appelée pour:', orderId);
    
    // Récupérer le token depuis l'header Authorization ou les cookies
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') ||
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
    console.log('🔑 Token trouvé:', !!token);
    
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      console.log('❌ Pas d\'utilisateur connecté');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    console.log('✅ Utilisateur connecté:', user.email);

    // Vérifier que l'utilisateur est un livreur (par email)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      console.log('❌ Rôle incorrect:', userData?.role, 'pour email:', user.email);
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }
    
    console.log('✅ Rôle livreur confirmé');

    // Vérifier que la commande existe et est en cours
    const { data: order, error: checkError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .in('status', ['accepted', 'in_delivery'])
      .single();

    if (checkError || !order) {
      console.log('❌ Commande non trouvée ou non en cours:', checkError);
      return NextResponse.json(
        { error: 'Commande non trouvée ou non en cours' },
        { status: 400 }
      );
    }
    
    console.log('✅ Commande trouvée:', order.id, 'statut:', order.status);

    // Marquer la commande comme livrée
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ Erreur mise à jour commande:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la finalisation de la livraison' },
        { status: 500 }
      );
    }
    
    console.log('✅ Commande livrée avec succès');

    return NextResponse.json({
      success: true,
      message: 'Livraison finalisée avec succès',
      orderId: orderId
    });
  } catch (error) {
    console.error('Erreur API finaliser livraison:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function POST(request, { params }) {
  try {
    const { orderId } = params;
    const body = await request.json();
    const { securityCode } = body;
    
    console.log('🔍 API complete-delivery appelée pour:', orderId);
    console.log('🔐 Code de sécurité reçu:', securityCode);
    
    // Vérifier que le code de sécurité est fourni
    if (!securityCode) {
      console.error('❌ Code de sécurité manquant');
      return NextResponse.json({ error: 'Code de sécurité requis' }, { status: 400 });
    }
    
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

    // Vérifier que la commande existe et n'est pas déjà livrée
    const { data: order, error: checkError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .not('status', 'eq', 'delivered')
      .single();

    if (checkError || !order) {
      console.log('❌ Commande non trouvée ou déjà livrée:', checkError);
      return NextResponse.json(
        { error: 'Commande non trouvée ou déjà livrée' },
        { status: 400 }
      );
    }
    
    console.log('✅ Commande trouvée:', order.id, 'statut:', order.status);

    // Vérifier le code de sécurité
    if (order.security_code !== securityCode) {
      console.error('❌ Code de sécurité incorrect:', securityCode, 'attendu:', order.security_code);
      return NextResponse.json({ error: 'Code de sécurité incorrect' }, { status: 400 });
    }

    console.log('✅ Code de sécurité validé');

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
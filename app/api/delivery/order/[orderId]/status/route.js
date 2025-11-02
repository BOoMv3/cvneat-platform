import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function PUT(request, { params }) {
  try {
    const { orderId } = params;
    const { status } = await request.json();
    
    console.log('🔍 API status update appelée pour commande:', orderId);
    
    // Récupérer le token depuis les cookies ou headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      console.log('❌ Pas d\'utilisateur connecté');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('✅ Utilisateur connecté:', user.email);

    // Vérifier que l'utilisateur est un livreur
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
    
    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vérifier que la commande appartient au livreur
    const { data: order, error: checkError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .eq('livreur_id', user.id)
      .single();

    if (checkError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée ou non autorisée' },
        { status: 403 }
      );
    }

    // Mettre à jour le statut
    const { error: updateError } = await supabaseAdmin
      .from('commandes')
      .update({
        statut: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Erreur mise à jour statut:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du statut' },
        { status: 500 }
      );
    }

    // Si la livraison est terminée, mettre à jour les stats du livreur
    if (status === 'livree') {
      const { data: currentStats } = await supabaseAdmin
        .from('delivery_stats')
        .select('*')
        .eq('delivery_id', user.id)
        .single();

      if (currentStats) {
        await supabaseAdmin
          .from('delivery_stats')
          .update({
            total_deliveries: (currentStats.total_deliveries || 0) + 1,
            total_earnings: (currentStats.total_earnings || 0) + (order.frais_livraison || 0)
          })
          .eq('delivery_id', user.id);
      } else {
        // Créer les stats si elles n'existent pas
        await supabaseAdmin
          .from('delivery_stats')
          .insert({
            delivery_id: user.id,
            total_deliveries: 1,
            total_earnings: order.frais_livraison || 0
          });
      }
      
      // Envoyer notification au client
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/delivery-completed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderId,
            customerId: order.user_id
          })
        });
      } catch (notificationError) {
        console.warn('⚠️ Erreur notification livraison:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Statut mis à jour avec succès',
      orderId: orderId,
      status: status
    });
  } catch (error) {
    console.error('Erreur API mise à jour statut:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 
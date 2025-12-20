import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

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
    
    // Token vérifié (non loggé pour des raisons de sécurité)
    
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      console.log('❌ Pas d\'utilisateur connecté');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    console.log('✅ Utilisateur connecté:', user.email);

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vérifier que l'utilisateur est un livreur (par ID pour plus de fiabilité)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      console.log('❌ Rôle incorrect:', userData?.role, 'pour ID:', user.id);
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }
    
    console.log('✅ Rôle livreur confirmé');

    // Vérifier que la commande existe et n'est pas déjà livrée
    const { data: order, error: checkError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .neq('statut', 'livree')
      .single();

    if (checkError || !order) {
      console.log('❌ Commande non trouvée ou déjà livrée:', checkError);
      return NextResponse.json(
        { error: 'Commande non trouvée ou déjà livrée' },
        { status: 400 }
      );
    }

    // VÉRIFICATION CRITIQUE: Bloquer si la commande est déjà annulée ou remboursée
    if (order.statut === 'annulee' || order.payment_status === 'refunded') {
      return NextResponse.json({ 
        error: 'Cette commande a été annulée ou remboursée et n\'est plus active',
        statut: order.statut,
        payment_status: order.payment_status
      }, { status: 400 });
    }
    
    // Vérifier que le livreur est bien assigné à cette commande
    if (order.livreur_id !== user.id) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas assigné à cette commande' },
        { status: 403 }
      );
    }
    
    console.log('✅ Commande trouvée:', order.id, 'statut:', order.statut);

    // Vérifier le code de sécurité (si présent)
    if (order.security_code && order.security_code !== securityCode) {
      console.error('❌ Code de sécurité incorrect:', securityCode, 'attendu:', order.security_code);
      return NextResponse.json({ error: 'Code de sécurité incorrect' }, { status: 400 });
    }

    console.log('✅ Code de sécurité validé');

    // Marquer la commande comme livrée
    const { error: updateError } = await supabaseAdmin
      .from('commandes')
      .update({
        statut: 'livree',
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

    // Envoyer une notification au client
    try {
      const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/delivery-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: orderId,
          customerId: order.user_id
        })
      });

      if (notificationResponse.ok) {
        console.log('✅ Notification de livraison envoyée');
      } else {
        console.warn('⚠️ Erreur envoi notification:', await notificationResponse.text());
      }
    } catch (notificationError) {
      console.warn('⚠️ Erreur notification livraison:', notificationError);
      // Ne pas faire échouer la livraison si la notification échoue
    }

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
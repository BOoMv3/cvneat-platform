import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const authClient = createClient(supabaseUrl, supabaseAnonKey);
const adminClient = createClient(supabaseUrl, serviceRoleKey);

// GET /api/admin/orders/[id] - Récupérer une commande spécifique
export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminUser, error: adminError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { data: order, error } = await adminClient
      .from('commandes')
      .select(`
        *,
        user:users(email, nom, telephone),
        restaurant:restaurants(nom, adresse, telephone),
        details_commande(
          *,
          menu:menus(nom, description, prix)
        ),
        delivery:users!livreur_id(email, nom, telephone)
      `)
      .eq('id', params.id)
      .single();

    if (error) throw error;

    return NextResponse.json(order);
  } catch (error) {
    console.error('Erreur récupération commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/admin/orders/[id] - Mettre à jour une commande
export async function PUT(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminUser, error: adminError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { status, delivery_id } = await request.json();

    const updateData = {};
    if (status !== undefined) {
      updateData.statut = status;
      const nowIso = new Date().toISOString();
      if (status === 'acceptee') {
        updateData.accepted_at = nowIso;
      } else if (status === 'refusee') {
        updateData.rejected_at = nowIso;
      } else if (status === 'pret_a_livrer') {
        updateData.ready_at = nowIso;
        updateData.ready_for_delivery = true;
      } else if (status === 'livree') {
        updateData.picked_up_at = updateData.picked_up_at || nowIso;
      }
    }
    if (delivery_id !== undefined) updateData.livreur_id = delivery_id;

    const { data: updatedOrder, error } = await adminClient
      .from('commandes')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        user:users(email, nom),
        restaurant:restaurants(nom),
        delivery:users!livreur_id(email, nom)
      `)
      .single();

    if (error) throw error;

    // Envoyer email de notification au client
    if (status) {
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'orderStatusUpdate',
            data: {
              id: updatedOrder.id,
              customerName: updatedOrder.user?.full_name || updatedOrder.user?.email,
              restaurantName: updatedOrder.restaurant?.nom || 'Restaurant',
              status
            },
            recipientEmail: updatedOrder.user?.email
          })
        });
      } catch (emailError) {
        console.error('Erreur envoi email statut commande:', emailError);
      }
    }

    // Envoyer email au livreur si assigné
    if (delivery_id && delivery_id !== updatedOrder.delivery_id) {
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'deliveryAssigned',
            data: {
              orderId: updatedOrder.id,
              deliveryName: updatedOrder.delivery?.full_name,
              restaurantName: updatedOrder.restaurant?.nom,
              deliveryAddress: updatedOrder.delivery_address
            },
            recipientEmail: updatedOrder.delivery?.email
          })
        });
      } catch (emailError) {
        console.error('Erreur envoi email livreur:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Erreur mise à jour commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/admin/orders/[id] - Annuler une commande
export async function DELETE(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminUser, error: adminError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Récupérer les infos de la commande avant annulation
    const { data: order, error: orderError } = await adminClient
      .from('commandes')
      .select(`
        *,
        user:users(email, full_name),
        restaurant:restaurants(nom)
      `)
      .eq('id', params.id)
      .single();

    if (orderError) throw orderError;

    // Annuler la commande
    const { data: cancelledOrder, error } = await adminClient
      .from('commandes')
      .update({ statut: 'annulee' })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Envoyer email de notification au client
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'orderCancelled',
          data: {
            id: order.id,
            customerName: order.user?.full_name || order.user?.email,
            restaurantName: order.restaurant?.nom || 'Restaurant',
            total: order.total_amount
          },
          recipientEmail: order.user?.email
        })
      });
    } catch (emailError) {
      console.error('Erreur envoi email annulation:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Commande annulée',
      order: cancelledOrder
    });
  } catch (error) {
    console.error('Erreur annulation commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
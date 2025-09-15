import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// POST /api/notifications/delivery-completed - Envoyer notification après livraison
export async function POST(request) {
  try {
    const { orderId, customerId } = await request.json();

    if (!orderId || !customerId) {
      return NextResponse.json(
        { error: 'orderId et customerId requis' },
        { status: 400 }
      );
    }

    // Récupérer les détails de la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        customer_name,
        restaurant:restaurants(name)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // Créer la notification
    const notification = {
      user_id: customerId,
      type: 'delivery_completed',
      title: 'Commande livrée avec succès ! 🎉',
      message: `Votre commande #${order.order_number} de ${order.restaurant?.name || 'le restaurant'} a été livrée.`,
      data: {
        order_id: orderId,
        order_number: order.order_number,
        restaurant_name: order.restaurant?.name,
        total_amount: order.total_amount,
        complaint_url: `/complaint/${orderId}`,
        complaint_available_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48h
      },
      read: false,
      created_at: new Date().toISOString()
    };

    // Sauvegarder la notification
    const { data: savedNotification, error: saveError } = await supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single();

    if (saveError) {
      console.error('Erreur sauvegarde notification:', saveError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la notification' },
        { status: 500 }
      );
    }

    // Essayer d'envoyer une notification push (si le service worker est disponible)
    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `delivery-${orderId}`,
          data: notification.data,
          actions: [
            {
              action: 'complaint',
              title: 'Signaler un problème',
              icon: '/icon-192x192.png'
            },
            {
              action: 'view',
              title: 'Voir la commande',
              icon: '/icon-192x192.png'
            }
          ],
          requireInteraction: true,
          silent: false
        });
      }
    } catch (pushError) {
      console.warn('Notification push non disponible:', pushError);
      // Ne pas faire échouer la requête si les notifications push ne fonctionnent pas
    }

    // Envoyer aussi un email de confirmation
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/email/delivery-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: customerId,
          orderId: orderId
        })
      });

      if (emailResponse.ok) {
        console.log('✅ Email de livraison envoyé');
      } else {
        console.warn('⚠️ Erreur envoi email:', await emailResponse.text());
      }
    } catch (emailError) {
      console.warn('⚠️ Erreur email livraison:', emailError);
    }

    return NextResponse.json({
      success: true,
      notification: savedNotification,
      message: 'Notification envoyée avec succès'
    });

  } catch (error) {
    console.error('Erreur notification livraison:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function POST(request) {
  try {
    const { restaurantId, type, message, data } = await request.json();

    if (!restaurantId || !type || !message) {
      return NextResponse.json(
        { error: 'Restaurant ID, type et message requis' },
        { status: 400 }
      );
    }

    // Créer la notification dans la base de données
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        restaurant_id: restaurantId,
        type: type,
        message: message,
        data: data || {},
        lu: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création notification:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la notification' },
        { status: 500 }
      );
    }

    // En production, vous pourriez envoyer une notification push réelle ici
    // Par exemple avec Firebase Cloud Messaging ou un service similaire
    
    return NextResponse.json({
      success: true,
      notification: notification,
      message: 'Notification envoyée avec succès'
    });

  } catch (error) {
    console.error('Erreur envoi notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de la notification' },
      { status: 500 }
    );
  }
}

// Fonction utilitaire pour envoyer des notifications automatiques
export async function sendAutomaticNotification(restaurantId, type, message, data = {}) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/partner/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId,
        type,
        message,
        data
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Erreur envoi notification automatique:', error);
    return false;
  }
} 
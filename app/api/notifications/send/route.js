import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const { userId, title, message, type, data } = await request.json();

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Enregistrer la notification dans la base de données
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type: type || 'info',
        data: data || {},
        read: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }

    // Ici, vous pourriez intégrer un service de notifications push
    // comme Firebase Cloud Messaging ou OneSignal
    // Pour l'instant, on enregistre juste dans la base de données

    return NextResponse.json({
      success: true,
      message: 'Notification envoyée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de la notification' },
      { status: 500 }
    );
  }
} 
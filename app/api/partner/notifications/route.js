import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID requis' }, { status: 400 });
    }

    // Récupérer les notifications non lues
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('lu', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(notifications || []);
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { restaurantId, type, message, orderId } = await request.json();

    if (!restaurantId || !type || !message) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        restaurant_id: restaurantId,
        type,
        message,
        order_id: orderId,
        lu: false
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur création notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la notification' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID requis' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ lu: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur mise à jour notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la notification' },
      { status: 500 }
    );
  }
} 
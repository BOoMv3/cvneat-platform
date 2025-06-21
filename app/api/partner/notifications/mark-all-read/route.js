import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function POST(request) {
  try {
    const { restaurantId } = await request.json();

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID requis' },
        { status: 400 }
      );
    }

    // Marquer toutes les notifications non lues comme lues
    const { data, error } = await supabase
      .from('notifications')
      .update({ lu: true })
      .eq('restaurant_id', restaurantId)
      .eq('lu', false)
      .select();

    if (error) {
      console.error('Erreur marquage notifications:', error);
      return NextResponse.json(
        { error: 'Erreur lors du marquage des notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount: data?.length || 0,
      message: `${data?.length || 0} notification(s) marquée(s) comme lue(s)`
    });

  } catch (error) {
    console.error('Erreur marquage toutes notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors du marquage des notifications' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// Récupérer les horaires d'un restaurant
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'ID restaurant requis' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('restaurant_hours')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('day_of_week');

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur lors de la récupération des horaires:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des horaires' },
      { status: 500 }
    );
  }
}

// Mettre à jour les horaires
export async function PUT(request) {
  try {
    const { restaurantId, hours } = await request.json();

    if (!restaurantId || !hours) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Supprimer les anciens horaires
    await supabase
      .from('restaurant_hours')
      .delete()
      .eq('restaurant_id', restaurantId);

    // Insérer les nouveaux horaires
    const hoursData = hours.map(hour => ({
      restaurant_id: restaurantId,
      day_of_week: hour.day,
      open_time: hour.open,
      close_time: hour.close,
      is_closed: hour.closed || false
    }));

    const { error } = await supabase
      .from('restaurant_hours')
      .insert(hoursData);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Horaires mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des horaires:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des horaires' },
      { status: 500 }
    );
  }
}

// Vérifier si un restaurant est ouvert
export async function POST(request) {
  try {
    const { restaurantId, date } = await request.json();

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'ID restaurant requis' },
        { status: 400 }
      );
    }

    const checkDate = date ? new Date(date) : new Date();
    const dayOfWeek = checkDate.getDay(); // 0 = dimanche, 1 = lundi, etc.
    const currentTime = checkDate.toTimeString().slice(0, 5); // HH:MM

    const { data, error } = await supabase
      .from('restaurant_hours')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (error) {
      throw error;
    }

    if (!data || data.is_closed) {
      return NextResponse.json({
        isOpen: false,
        message: 'Restaurant fermé aujourd\'hui'
      });
    }

    const isOpen = currentTime >= data.open_time && currentTime <= data.close_time;

    return NextResponse.json({
      isOpen,
      openTime: data.open_time,
      closeTime: data.close_time,
      message: isOpen ? 'Restaurant ouvert' : 'Restaurant fermé'
    });
  } catch (error) {
    console.error('Erreur lors de la vérification des horaires:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification des horaires' },
      { status: 500 }
    );
  }
} 
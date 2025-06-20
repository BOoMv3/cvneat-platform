import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// Récupérer les points de fidélité d'un utilisateur
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({
      points: data?.points || 0,
      level: data?.level || 'bronze',
      totalSpent: data?.total_spent || 0
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des points:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des points' },
      { status: 500 }
    );
  }
}

// Ajouter des points après une commande
export async function POST(request) {
  try {
    const { userId, orderId, amount, points } = await request.json();

    if (!userId || !orderId || !amount) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Calculer les points (1 point par euro dépensé)
    const earnedPoints = Math.floor(amount);
    const newLevel = calculateLevel(earnedPoints);

    // Insérer ou mettre à jour les points
    const { data, error } = await supabase
      .from('loyalty_points')
      .upsert({
        user_id: userId,
        points: earnedPoints,
        level: newLevel,
        total_spent: amount,
        last_order_id: orderId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      points: data.points,
      level: data.level,
      earnedPoints
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout des points:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout des points' },
      { status: 500 }
    );
  }
}

function calculateLevel(points) {
  if (points >= 1000) return 'diamond';
  if (points >= 500) return 'platinum';
  if (points >= 200) return 'gold';
  if (points >= 50) return 'silver';
  return 'bronze';
} 
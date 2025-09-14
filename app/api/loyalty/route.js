import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// API pour gérer le programme de fidélité
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID requis' }, { status: 400 });
    }

    // Récupérer les informations de fidélité de l'utilisateur
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('points_fidelite, niveau_fidelite')
      .eq('id', userId)
      .single();

    if (userError) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Récupérer l'historique des points
    const { data: history, error: historyError } = await supabase
      .from('loyalty_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (historyError) {
      console.error('Erreur lors de la récupération de l\'historique:', historyError);
    }

    // Calculer le niveau de fidélité
    const points = user.points_fidelite || 0;
    let currentLevel = 'bronze';
    let nextLevel = 'silver';
    let progressToNext = 0;

    const levels = [
      { name: 'bronze', minPoints: 0 },
      { name: 'silver', minPoints: 500 },
      { name: 'gold', minPoints: 1500 },
      { name: 'platinum', minPoints: 3000 },
      { name: 'diamond', minPoints: 5000 }
    ];

    for (let i = levels.length - 1; i >= 0; i--) {
      if (points >= levels[i].minPoints) {
        currentLevel = levels[i].name;
        if (i + 1 < levels.length) {
          nextLevel = levels[i + 1].name;
          const currentLevelPoints = levels[i].minPoints;
          const nextLevelPoints = levels[i + 1].minPoints;
          progressToNext = ((points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
        } else {
          nextLevel = null;
          progressToNext = 100;
        }
        break;
      }
    }

    return NextResponse.json({
      points,
      currentLevel,
      nextLevel,
      progressToNext,
      history: history || []
    });

  } catch (error) {
    console.error('Erreur API fidélité:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId, action, amount, description, orderId } = await request.json();

    if (!userId || !action || !amount) {
      return NextResponse.json({ 
        error: 'Paramètres requis: userId, action, amount' 
      }, { status: 400 });
    }

    // Récupérer les points actuels de l'utilisateur
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('points_fidelite')
      .eq('id', userId)
      .single();

    if (userError) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const currentPoints = user.points_fidelite || 0;
    let newPoints = currentPoints;

    // Calculer les nouveaux points selon l'action
    switch (action) {
      case 'earn':
        newPoints += amount;
        break;
      case 'redeem':
        if (currentPoints < amount) {
          return NextResponse.json({ 
            error: 'Points insuffisants' 
          }, { status: 400 });
        }
        newPoints -= amount;
        break;
      case 'bonus':
        newPoints += amount;
        break;
      default:
        return NextResponse.json({ 
          error: 'Action non valide' 
        }, { status: 400 });
    }

    // Mettre à jour les points de l'utilisateur
    const { error: updateError } = await supabase
      .from('users')
      .update({ points_fidelite: newPoints })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ 
        error: 'Erreur lors de la mise à jour des points' 
      }, { status: 500 });
    }

    // Enregistrer dans l'historique
    const { error: historyError } = await supabase
      .from('loyalty_history')
      .insert({
        user_id: userId,
        action,
        points_change: amount,
        points_balance: newPoints,
        description: description || `${action === 'earn' ? 'Gain' : 'Dépense'} de ${amount} points`,
        order_id: orderId || null,
        created_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('Erreur lors de l\'enregistrement de l\'historique:', historyError);
    }

    return NextResponse.json({
      success: true,
      newPoints,
      pointsChange: amount,
      action
    });

  } catch (error) {
    console.error('Erreur API fidélité POST:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

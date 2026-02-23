import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET /api/loyalty/points - Récupérer les points et l'historique de fidélité
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Récupérer les informations de fidélité de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('points_fidelite, loyalty_level, total_spent, loyalty_points_earned, loyalty_points_spent')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    // Récupérer l'historique des points
    const { data: history, error: historyError } = await supabase
      .from('loyalty_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (historyError) throw historyError;

    return NextResponse.json({
      points: userData.points_fidelite || 0,
      level: userData.loyalty_level || 'Bronze',
      totalSpent: userData.total_spent || 0,
      pointsEarned: userData.loyalty_points_earned || 0,
      pointsSpent: userData.loyalty_points_spent || 0,
      history: history || []
    });
  } catch (error) {
    console.error('Erreur récupération points fidélité:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/loyalty/points - Ajouter des points (après une commande)
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { orderId, orderAmount, reason = 'Commande' } = await request.json();

    if (!orderId || !orderAmount) {
      return NextResponse.json({ error: 'ID commande et montant requis' }, { status: 400 });
    }

    // Calculer les points gagnés (1 point par euro)
    const pointsEarned = Math.floor(orderAmount);

    // Mettre à jour les points de l'utilisateur
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        points_fidelite: supabase.sql`points_fidelite + ${pointsEarned}`,
        loyalty_points_earned: supabase.sql`loyalty_points_earned + ${pointsEarned}`,
        total_spent: supabase.sql`total_spent + ${orderAmount}`
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Enregistrer dans l'historique
    const { error: historyError } = await supabase
      .from('loyalty_history')
      .insert([{
        user_id: user.id,
        order_id: orderId,
        points_earned: pointsEarned,
        reason,
        description: `Commande #${orderId} - ${orderAmount}€`
      }]);

    if (historyError) throw historyError;

    return NextResponse.json({
      success: true,
      pointsEarned,
      newTotal: updatedUser.points_fidelite,
      level: updatedUser.loyalty_level
    });
  } catch (error) {
    console.error('Erreur ajout points fidélité:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/loyalty/points - Utiliser des points (réduction)
export async function PUT(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { pointsToSpend, reason = 'Réduction' } = await request.json();

    if (!pointsToSpend || pointsToSpend <= 0) {
      return NextResponse.json({ error: 'Nombre de points valide requis' }, { status: 400 });
    }

    // Vérifier que l'utilisateur a assez de points
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('points_fidelite')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    if (userData.points_fidelite < pointsToSpend) {
      return NextResponse.json({ error: 'Points insuffisants' }, { status: 400 });
    }

    // Déduire les points
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        points_fidelite: supabase.sql`points_fidelite - ${pointsToSpend}`,
        loyalty_points_spent: supabase.sql`loyalty_points_spent + ${pointsToSpend}`
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Enregistrer dans l'historique
    const { error: historyError } = await supabase
      .from('loyalty_history')
      .insert([{
        user_id: user.id,
        points_spent: pointsToSpend,
        reason,
        description: `Utilisation de ${pointsToSpend} points`
      }]);

    if (historyError) throw historyError;

    return NextResponse.json({
      success: true,
      pointsSpent: pointsToSpend,
      newTotal: updatedUser.points_fidelite
    });
  } catch (error) {
    console.error('Erreur utilisation points fidélité:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
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

    const { data: user, error } = await supabase
      .from('users')
      .select('points_fidelite, historique_points')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erreur récupération points:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des points' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      points: user.points_fidelite || 0,
      historique: user.historique_points || []
    });
  } catch (error) {
    console.error('Erreur API points fidélité:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// Ajouter des points de fidélité
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, points, raison, commandeId } = body;

    if (!userId || !points || !raison) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    // Récupérer les points actuels
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('points_fidelite, historique_points')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Erreur récupération utilisateur:', fetchError);
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const nouveauxPoints = (currentUser.points_fidelite || 0) + points;
    const historique = currentUser.historique_points || [];
    
    // Ajouter l'entrée dans l'historique
    const nouvelleEntree = {
      date: new Date().toISOString(),
      points: points,
      raison: raison,
      commande_id: commandeId,
      total_apres: nouveauxPoints
    };

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        points_fidelite: nouveauxPoints,
        historique_points: [...historique, nouvelleEntree]
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour points:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des points' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      points: nouveauxPoints,
      message: `${points} points ajoutés pour: ${raison}`
    });
  } catch (error) {
    console.error('Erreur API ajout points:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// Utiliser des points de fidélité
export async function PUT(request) {
  try {
    const body = await request.json();
    const { userId, points, raison, commandeId } = body;

    if (!userId || !points || !raison) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    // Récupérer les points actuels
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('points_fidelite, historique_points')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Erreur récupération utilisateur:', fetchError);
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const pointsActuels = currentUser.points_fidelite || 0;
    
    if (pointsActuels < points) {
      return NextResponse.json(
        { error: 'Points insuffisants' },
        { status: 400 }
      );
    }

    const nouveauxPoints = pointsActuels - points;
    const historique = currentUser.historique_points || [];
    
    // Ajouter l'entrée dans l'historique
    const nouvelleEntree = {
      date: new Date().toISOString(),
      points: -points,
      raison: raison,
      commande_id: commandeId,
      total_apres: nouveauxPoints
    };

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        points_fidelite: nouveauxPoints,
        historique_points: [...historique, nouvelleEntree]
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour points:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des points' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      points: nouveauxPoints,
      message: `${points} points utilisés pour: ${raison}`
    });
  } catch (error) {
    console.error('Erreur API utilisation points:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 
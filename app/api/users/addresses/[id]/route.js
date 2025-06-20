import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Récupérer les données du body
    const body = await request.json();
    const { name, address, city, postalCode, instructions } = body;

    // Pour l'instant, retourner un succès simulé
    // TODO: Implémenter la vraie logique avec la table user_addresses
    const mockAddress = {
      id,
      user_id: user.id,
      name,
      address,
      city,
      postal_code: postalCode,
      instructions,
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      message: 'Adresse mise à jour avec succès (simulation)',
      address: mockAddress
    });

  } catch (error) {
    console.error('Erreur dans /api/users/addresses/[id] PUT:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Pour l'instant, retourner un succès simulé
    // TODO: Implémenter la vraie logique avec la table user_addresses
    return NextResponse.json({
      message: 'Adresse supprimée avec succès (simulation)'
    });

  } catch (error) {
    console.error('Erreur dans /api/users/addresses/[id] DELETE:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
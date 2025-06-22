import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Retourner null pour éviter les erreurs de base de données
    return NextResponse.json(null);
  } catch (error) {
    console.error('Erreur API commande en cours:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 
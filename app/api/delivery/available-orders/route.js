import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Retourner un tableau vide pour éviter les erreurs de base de données
    return NextResponse.json([]);
  } catch (error) {
    console.error('Erreur API commandes disponibles:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 
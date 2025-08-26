import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Données d'exemple pour l'admin
    const restaurantsData = {
      restaurants: [],
      total: 0
    };

    return NextResponse.json(restaurantsData);
  } catch (error) {
    console.error('Erreur API admin restaurants:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 
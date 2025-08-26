import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Données d'exemple pour l'admin
    const usersData = {
      users: [],
      total: 0
    };

    return NextResponse.json(usersData);
  } catch (error) {
    console.error('Erreur API admin users:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 
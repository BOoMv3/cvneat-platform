import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Données d'exemple pour le dashboard analytics
    const analyticsData = {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      topRestaurants: [],
      recentOrders: []
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Erreur API analytics:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 
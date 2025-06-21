import { NextResponse } from 'next/server';

export async function GET(request) {
  // Simulation d'une connexion WebSocket pour les notifications
  // En production, vous utiliseriez une vraie implémentation WebSocket
  
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');

  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurant ID requis' }, { status: 400 });
  }

  // Retourner un endpoint pour les notifications SSE (Server-Sent Events)
  return NextResponse.json({
    endpoint: `/api/partner/notifications/sse?restaurantId=${restaurantId}`,
    message: 'Connectez-vous à l\'endpoint SSE pour recevoir les notifications'
  });
} 
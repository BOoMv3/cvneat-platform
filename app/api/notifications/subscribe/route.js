import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const subscription = await request.json();
    
    // Ici vous devriez récupérer l'ID utilisateur depuis le token d'authentification
    // Pour simplifier, on utilise un utilisateur par défaut
    const userId = 'default-user-id';

    // Sauvegarder l'abonnement en base de données
    const { error } = await supabase
      .from('notification_subscriptions')
      .upsert({
        user_id: userId,
        subscription_data: subscription,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erreur lors de la sauvegarde de l\'abonnement:', error);
      return NextResponse.json({ error: 'Erreur de sauvegarde' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erreur API notifications:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

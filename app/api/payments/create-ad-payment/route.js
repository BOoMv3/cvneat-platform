import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbqrvlmvnofaxbtcmsw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      image_url,
      link_url,
      position,
      start_date,
      end_date,
      advertiser_name,
      advertiser_email,
      advertiser_phone,
      price
    } = body;

    // Validation des données
    if (!title || !image_url || !advertiser_name || !advertiser_email || !price) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Simulation du paiement (en production, intégrer Stripe/PayPal)
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentStatus = 'completed'; // Simulation d'un paiement réussi

    if (paymentStatus === 'completed') {
      // Insérer la publicité dans la base de données
      const { data, error } = await supabase
        .from('advertisements')
        .insert([{
          title,
          description,
          image_url,
          link_url,
          position,
          is_active: false, // En attente de validation admin
          start_date: start_date || null,
          end_date: end_date || null,
          price: parseFloat(price),
          advertiser_name,
          advertiser_email,
          advertiser_phone,
          payment_id: paymentId,
          payment_status: 'completed',
          status: 'pending_approval' // En attente d'approbation
        }])
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création de la publicité:', error);
        return NextResponse.json(
          { error: 'Erreur lors de la sauvegarde' },
          { status: 500 }
        );
      }

      // Envoyer un email de confirmation (simulation)
      console.log(`Email envoyé à ${advertiser_email} pour la publicité: ${title}`);

      return NextResponse.json({
        success: true,
        payment_id: paymentId,
        advertisement_id: data.id,
        message: 'Publicité créée avec succès. En attente de validation.'
      });
    } else {
      return NextResponse.json(
        { error: 'Paiement échoué' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Erreur lors du traitement du paiement:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

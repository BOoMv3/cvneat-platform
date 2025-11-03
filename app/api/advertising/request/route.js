import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, businessName, businessType, contactName, email, phone, website, description, position, duration, budget } = body;

    if (!userId || !businessName || !contactName || !email || !phone || !description || !position || !duration || !budget) {
      return NextResponse.json({ error: 'Tous les champs obligatoires doivent être remplis' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Créer la demande de publicité
    const { data, error } = await supabaseAdmin
      .from('advertising_requests')
      .insert({
        user_id: userId,
        business_name: businessName,
        business_type: businessType,
        contact_name: contactName,
        email,
        phone,
        website: website || null,
        description,
        position,
        duration_days: parseInt(duration),
        budget: parseFloat(budget),
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      // Si la table n'existe pas, créer une table simple pour stocker les demandes
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'La table advertising_requests n\'existe pas. Veuillez créer la table dans Supabase.',
          details: 'CREATE TABLE advertising_requests (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID REFERENCES users(id), business_name TEXT, contact_name TEXT, email TEXT, phone TEXT, description TEXT, position TEXT, duration_days INTEGER, budget DECIMAL, status TEXT DEFAULT \'pending\', created_at TIMESTAMP DEFAULT NOW());'
        }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Demande de publicité envoyée avec succès',
      requestId: data.id
    });

  } catch (error) {
    console.error('Erreur création demande publicité:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


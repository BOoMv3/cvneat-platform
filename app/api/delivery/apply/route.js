import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, nom, prenom, email, phone, address, city, postalCode, vehicleType, hasLicense, experience, availability } = body;

    if (!userId || !nom || !prenom || !email || !phone || !address || !city || !postalCode || !hasLicense || !availability) {
      return NextResponse.json({ error: 'Tous les champs obligatoires doivent être remplis' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Créer la demande de livreur
    const { data, error } = await supabaseAdmin
      .from('delivery_applications')
      .insert({
        user_id: userId,
        nom,
        prenom,
        email,
        phone,
        address,
        city,
        postal_code: postalCode,
        vehicle_type: vehicleType,
        has_license: hasLicense,
        experience: experience || null,
        availability,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'La table delivery_applications n\'existe pas. Veuillez créer la table dans Supabase.',
          details: 'CREATE TABLE delivery_applications (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID REFERENCES users(id), nom TEXT, prenom TEXT, email TEXT, phone TEXT, address TEXT, city TEXT, postal_code TEXT, vehicle_type TEXT, has_license BOOLEAN, experience TEXT, availability TEXT, status TEXT DEFAULT \'pending\', created_at TIMESTAMP DEFAULT NOW());'
        }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Candidature envoyée avec succès',
      applicationId: data.id
    });

  } catch (error) {
    console.error('Erreur création candidature livreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


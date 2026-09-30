import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_VEHICLE_TYPES = ['bike', 'scooter', 'trotinette', 'car', 'motorcycle'];
const VEHICLE_ALIASES = {
  velo: 'bike',
  bike: 'bike',
  scooter: 'scooter',
  trotinette: 'trotinette',
  voiture: 'car',
  car: 'car',
  moto: 'motorcycle',
  motorcycle: 'motorcycle',
};

function normalizeVehicleType(val) {
  if (!val || typeof val !== 'string') return 'bike';
  const v = val
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (ALLOWED_VEHICLE_TYPES.includes(v)) return v;
  return VEHICLE_ALIASES[v] || 'bike';
}

function normalizePhone(value = '') {
  return String(value).replace(/[^\d+]/g, '').trim();
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const prenom = String(body.prenom || body.contact_name || '').trim();
    const nom = String(body.nom || '').trim() || 'Candidat';
    const email = String(body.email || '').trim().toLowerCase();
    const phone = normalizePhone(body.telephone || body.phone || '');
    const city = String(body.ville || body.city || '').trim();
    const vehicleType = normalizeVehicleType(body.vehicleType || body.vehicle_type);
    const availability = String(body.availability || 'Flexible').trim();

    if (!prenom) {
      return NextResponse.json({ error: 'Votre prénom est requis.' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Un email valide est requis.' }, { status: 400 });
    }
    if (!phone || phone.replace(/\D/g, '').length < 8) {
      return NextResponse.json({ error: 'Un téléphone valide est requis.' }, { status: 400 });
    }
    if (!city) {
      return NextResponse.json({ error: 'La ville est requise.' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: existing } = await supabaseAdmin
      .from('delivery_applications')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json(
        { error: 'Une candidature est déjà en cours avec cet email.' },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('delivery_applications')
      .insert({
        user_id: null,
        nom,
        prenom,
        email,
        phone,
        address: city,
        city,
        postal_code: String(body.postalCode || body.code_postal || '00000').trim() || '00000',
        vehicle_type: vehicleType,
        has_license: body.hasLicense !== false,
        experience: body.experience
          ? String(body.experience)
          : 'Candidature via landing devenir-livreur',
        availability,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('delivery-leads insert:', error);
      return NextResponse.json({ error: error.message || 'Erreur enregistrement' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    console.error('delivery-leads POST:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

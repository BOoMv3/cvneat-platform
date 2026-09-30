import { NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

function normalizePhone(value = '') {
  return String(value).replace(/[^\d+]/g, '').trim();
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const nom = String(body.nom || body.commerce || '').trim();
    const ville = String(body.ville || '').trim();
    const contactName = String(body.contact_name || body.contactName || body.votre_nom || '').trim();
    const telephone = normalizePhone(body.telephone || body.phone || '');
    const email = String(body.email || '').trim().toLowerCase();
    const website = String(body.website || body.site || '').trim();

    if (!nom) {
      return NextResponse.json({ error: 'Le nom du commerce est requis.' }, { status: 400 });
    }
    if (!ville) {
      return NextResponse.json({ error: 'La ville est requise.' }, { status: 400 });
    }
    if (!contactName) {
      return NextResponse.json({ error: 'Votre nom est requis.' }, { status: 400 });
    }
    if (!telephone || telephone.replace(/\D/g, '').length < 8) {
      return NextResponse.json({ error: 'Un numéro de téléphone valide est requis.' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Un email valide est requis pour vous recontacter.' }, { status: 400 });
    }

    const descriptionParts = [
      `Contact: ${contactName}`,
      website ? `Site: ${website}` : null,
      'Source: landing devenir-partenaire',
    ].filter(Boolean);

    const payload = {
      nom,
      email,
      telephone,
      ville,
      adresse: ville,
      description: descriptionParts.join(' · '),
      status: 'pending',
    };
    if (body.code_postal) payload.code_postal = String(body.code_postal).trim();

    const db = supabaseAdmin || supabase;
    const { data: existing } = await db
      .from('restaurant_requests')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json(
        { error: 'Une demande existe déjà avec cet email. Contactez contact@cvneat.fr.' },
        { status: 409 }
      );
    }

    const { data, error } = await db
      .from('restaurant_requests')
      .insert([payload])
      .select('id')
      .single();

    if (error) {
      console.error('restaurant-requests insert:', error);
      return NextResponse.json(
        { error: error.message || 'Impossible d’enregistrer la demande.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    console.error('restaurant-requests POST:', e);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

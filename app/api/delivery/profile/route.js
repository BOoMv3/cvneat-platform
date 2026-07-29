import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isDeliveryRole(role) {
  const r = (role || '').toLowerCase();
  return r === 'delivery' || r === 'livreur';
}

const PROFILE_SELECT_FULL =
  'id, nom, prenom, email, telephone, role, adresse, code_postal, ville, photo_url, siret, legal_name, vat_number, kbis_url, created_at, updated_at';
const PROFILE_SELECT_BASE =
  'id, nom, prenom, email, telephone, role, adresse, photo_url, siret, legal_name, created_at, updated_at';
const PROFILE_SELECT_MID =
  'id, nom, prenom, email, telephone, role, adresse, code_postal, ville, photo_url, siret, legal_name, vat_number, created_at, updated_at';

async function getDeliveryUser(token) {
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return { error: 'Non autorisé', status: 401 };

  let { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select(PROFILE_SELECT_FULL)
    .eq('id', user.id)
    .single();

  if (userError) {
    const mid = await supabaseAdmin
      .from('users')
      .select(PROFILE_SELECT_MID)
      .eq('id', user.id)
      .single();
    if (!mid.error && mid.data) {
      userData = mid.data;
      userError = null;
    } else {
      const fallback = await supabaseAdmin
        .from('users')
        .select(PROFILE_SELECT_BASE)
        .eq('id', user.id)
        .single();
      userData = fallback.data;
      userError = fallback.error;
    }
  }

  if (userError || !userData) return { error: 'Utilisateur non trouvé', status: 404 };
  if (!isDeliveryRole(userData.role)) return { error: 'Accès refusé - Rôle invalide', status: 403 };
  return { user, userData };
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 401 });

    const auth = await getDeliveryUser(token);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    return NextResponse.json(auth.userData);
  } catch (error) {
    console.error('Erreur API profile:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 401 });

    const auth = await getDeliveryUser(token);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const {
      prenom,
      nom,
      telephone,
      adresse,
      code_postal,
      ville,
      photo_url,
      siret,
      legal_name,
      vat_number,
    } = body;

    const updateData = {};
    if (prenom !== undefined) updateData.prenom = prenom;
    if (nom !== undefined) updateData.nom = nom;
    if (telephone !== undefined) updateData.telephone = telephone;
    if (adresse !== undefined) updateData.adresse = adresse;
    if (photo_url !== undefined) updateData.photo_url = photo_url;
    if (siret !== undefined) updateData.siret = String(siret || '').replace(/\s/g, '').trim() || null;
    if (legal_name !== undefined) updateData.legal_name = String(legal_name || '').trim() || null;

    // Colonnes optionnelles (migration 20260729130000)
    const optional = {};
    if (code_postal !== undefined) optional.code_postal = code_postal;
    if (ville !== undefined) optional.ville = ville;
    if (vat_number !== undefined) optional.vat_number = String(vat_number || '').trim() || null;

    let { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ ...updateData, ...optional })
      .eq('id', auth.user.id)
      .select(PROFILE_SELECT_FULL)
      .single();

    if (updateError) {
      // Retry sans colonnes optionnelles si migration non appliquée
      const retry = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', auth.user.id)
        .select(PROFILE_SELECT_BASE)
        .single();
      updatedUser = retry.data;
      updateError = retry.error;
    }

    if (updateError) {
      console.error('Erreur mise à jour profil:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Erreur API profile update:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

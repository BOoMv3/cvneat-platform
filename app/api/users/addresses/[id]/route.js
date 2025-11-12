import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin as supabaseAdminClient } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

let cachedServiceClient = null;

function getServiceClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  if (cachedServiceClient) {
    return cachedServiceClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return null;
  }

  cachedServiceClient = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return cachedServiceClient;
}

function extractNameParts(name = '') {
  if (!name || typeof name !== 'string') {
    return { firstName: 'Client', lastName: 'CVNEAT' };
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0] || 'Client', lastName: 'CVNEAT' };
  }

  const firstName = parts.shift() || 'Client';
  const lastName = parts.join(' ') || 'CVNEAT';
  return { firstName, lastName };
}

async function ensureUserProfile(serviceClient, user, fallback = {}) {
  const normalizeRole = (role) => {
    const allowedRoles = new Set(['user', 'admin', 'restaurant', 'delivery']);
    if (role && allowedRoles.has(role)) {
      return role;
    }
    if (role === 'customer' || role === 'client') {
      return 'user';
    }
    return 'user';
  };

  try {
    const { data: existingUser, error: selectError } = await serviceClient
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.warn('⚠️ Impossible de vérifier le profil utilisateur:', selectError);
    }

    if (existingUser) {
      return;
    }

    const metadata = user.user_metadata || {};
    const { firstName, lastName } = extractNameParts(
      fallback.name || metadata.prenom || metadata.full_name || metadata.name
    );

    const payload = {
      id: user.id,
      email: (user.email || fallback.email || '').toLowerCase(),
      nom: fallback.nom || metadata.nom || lastName || 'CVNEAT',
      prenom: fallback.prenom || metadata.prenom || firstName || 'Client',
      telephone: fallback.telephone || metadata.telephone || user.phone || '0000000000',
      adresse: fallback.address || metadata.adresse || 'Adresse à compléter',
      code_postal: fallback.postalCode || metadata.code_postal || '00000',
      ville: fallback.city || metadata.ville || 'Ville à compléter',
      role: normalizeRole(fallback.role || metadata.role),
    };

    if (!payload.email) {
      payload.email = `${user.id}@placeholder.cvneat`;
    }

    const { error: upsertError } = await serviceClient
      .from('users')
      .upsert(payload, { onConflict: 'id' });

    if (upsertError) {
      console.error('❌ Impossible de créer le profil utilisateur manquant:', upsertError);
    } else {
      console.log('✅ Profil utilisateur créé automatiquement pour', payload.email);
    }
  } catch (profileError) {
    console.error('❌ Erreur ensureUserProfile:', profileError);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      address,
      city,
      postal_code,
      postalCode,
      instructions
    } = body;

    const normalizedPostalCode = postal_code ?? postalCode ?? null;

    if (!address || !city || !normalizedPostalCode) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    const serviceClient = getServiceClient();

    if (!serviceClient) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante pour mise à jour adresse');
      return NextResponse.json(
        { error: 'Configuration Supabase manquante côté serveur' },
        { status: 500 }
      );
    }

    await ensureUserProfile(serviceClient, user, {
      name,
      address,
      city,
      postalCode: normalizedPostalCode,
      email: user.email,
    });

    // Mise à jour de l'adresse dans la table user_addresses
    const { data, error } = await serviceClient
      .from('user_addresses')
      .update({
        name,
        address,
        city,
        postal_code: normalizedPostalCode,
        instructions,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour adresse:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Adresse mise à jour avec succès',
      address: {
        ...data,
        postalCode: data.postal_code ?? data.postalCode ?? null
      }
    });

  } catch (error) {
    console.error('Erreur dans /api/users/addresses/[id] PUT:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Suppression de l'adresse
    const serviceClient = getServiceClient();

    if (!serviceClient) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante pour suppression adresse');
      return NextResponse.json(
        { error: 'Configuration Supabase manquante côté serveur' },
        { status: 500 }
      );
    }

    const { error } = await serviceClient
      .from('user_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Erreur suppression adresse:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Adresse supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur dans /api/users/addresses/[id] DELETE:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
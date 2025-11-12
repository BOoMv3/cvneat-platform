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
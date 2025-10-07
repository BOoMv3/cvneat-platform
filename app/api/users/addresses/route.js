import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Créer un client avec le service role pour contourner RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = 'force-dynamic';

// GET /api/users/addresses - Récupérer les adresses de l'utilisateur
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }
    const { data: addresses, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(addresses || []);
  } catch (error) {
    console.error('Erreur dans /api/users/addresses GET:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/users/addresses - Ajouter une nouvelle adresse
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }
    const body = await request.json();
    const { name, address, city, postal_code, instructions, is_default } = body;
    if (!address || !city || !postal_code) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }
    // Si is_default, mettre toutes les autres adresses à false
    if (is_default) {
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }
    const { data: newAddress, error } = await supabaseAdmin
      .from('user_addresses')
      .insert([
        {
          user_id: user.id,
          name,
          address,
          city,
          postal_code,
          instructions,
          is_default: !!is_default
        }
      ])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ message: 'Adresse ajoutée', address: newAddress });
  } catch (error) {
    console.error('Erreur dans /api/users/addresses POST:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/users/addresses - Mettre à jour une adresse
export async function PUT(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }
    const { id, name, address, city, postal_code, instructions, is_default } = await request.json();
    if (!id || !address || !city || !postal_code) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }
    // Si is_default, mettre toutes les autres adresses à false
    if (is_default) {
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }
    const { data: updated, error } = await supabase
      .from('user_addresses')
      .update({
        name,
        address,
        city,
        postal_code,
        instructions,
        is_default: !!is_default
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ message: 'Adresse mise à jour', address: updated });
  } catch (error) {
    console.error('Erreur dans /api/users/addresses PUT:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/users/addresses - Supprimer une adresse
export async function DELETE(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID de l\'adresse requis' }, { status: 400 });
    }
    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    return NextResponse.json({ message: 'Adresse supprimée' });
  } catch (error) {
    console.error('Erreur dans /api/users/addresses DELETE:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
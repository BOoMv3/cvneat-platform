import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Créer un client admin pour bypasser RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = 'force-dynamic';

export async function PUT(request) {
  try {
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Récupérer les données du body
    const body = await request.json();
    const { nom, prenom, email, phone } = body;

    // Vérifier si l'utilisateur existe dans la table users
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Erreur lors de la vérification de l\'utilisateur:', checkError);
      return NextResponse.json({ error: 'Erreur lors de la vérification de l\'utilisateur' }, { status: 500 });
    }

    let result;
    if (existingUser) {
      // Mettre à jour l'utilisateur existant
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          nom: nom !== undefined ? nom : existingUser.nom || '',
          prenom: prenom !== undefined ? prenom : existingUser.prenom || '',
          email: email || existingUser.email,
          telephone: phone !== undefined ? phone : existingUser.telephone || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour du profil', details: error.message }, { status: 500 });
      }
      result = data;
    } else {
      // Créer un nouvel utilisateur dans la table users
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          nom: nom || '',
          prenom: prenom || '',
          email: email || user.email,
          telephone: phone || '',
          role: 'user'
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création du profil:', error);
        return NextResponse.json({ error: 'Erreur lors de la création du profil' }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({
      message: 'Profil mis à jour avec succès',
      user: {
        id: result.id,
        email: result.email,
        nom: result.nom || '',
        prenom: result.prenom || '',
        name: `${result.prenom || ''} ${result.nom || ''}`.trim() || result.email,
        phone: result.telephone || ''
      }
    });

  } catch (error) {
    console.error('Erreur dans /api/users/profile:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
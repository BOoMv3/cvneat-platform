import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Récupérer les données du body
    const body = await request.json();
    const { nom, prenom, email, phone } = body;

    // Vérifier si l'utilisateur existe dans la table users
    const { data: existingUser, error: checkError } = await supabase
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
      const { data, error } = await supabase
        .from('users')
        .update({
          nom: nom || existingUser.nom || '',
          prenom: prenom || existingUser.prenom || '',
          email: email || existingUser.email,
          telephone: phone || existingUser.telephone || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour du profil' }, { status: 500 });
      }
      result = data;
    } else {
      // Créer un nouvel utilisateur dans la table users
      const { data, error } = await supabase
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
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { nom, prenom, email, password, telephone, adresse, codePostal, ville } = await request.json();

    // Validation des données
    if (!nom || !prenom || !email || !password || !telephone || !adresse || !codePostal || !ville) {
      return NextResponse.json(
        { message: 'Tous les champs sont obligatoires' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    if (existingUser) {
      return NextResponse.json(
        { message: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    // Créer l'utilisateur dans Supabase Auth
    const { data: authUser, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) {
      return NextResponse.json(
        { message: signUpError.message },
        { status: 400 }
      );
    }

    // Ajouter les infos complémentaires dans la table users
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        nom,
        prenom,
        telephone,
        adresse,
        code_postal: codePostal,
        ville,
        role: 'user',
      });
    if (insertError) {
      return NextResponse.json(
        { message: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Inscription réussie, veuillez vérifier votre email pour valider votre compte.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    return NextResponse.json(
      { message: 'Une erreur est survenue lors de l\'inscription' },
      { status: 500 }
    );
  }
} 
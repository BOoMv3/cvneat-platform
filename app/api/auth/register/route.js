import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const { isValidEmail, validatePassword, sanitizeInput, isValidPhone, isValidPostalCode } = require('@/lib/validation');

// Créer le client Supabase public
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Créer le client admin pour vérifier les utilisateurs Auth
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

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

    // Validation du format email
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: 'Format d\'email invalide' },
        { status: 400 }
      );
    }

    // Validation du mot de passe
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { message: 'Mot de passe invalide', errors: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Validation du téléphone
    if (!isValidPhone(telephone)) {
      return NextResponse.json(
        { message: 'Format de téléphone invalide' },
        { status: 400 }
      );
    }

    // Validation du code postal
    if (!isValidPostalCode(codePostal)) {
      return NextResponse.json(
        { message: 'Format de code postal invalide' },
        { status: 400 }
      );
    }

    // Sanitisation des inputs
    const sanitizedData = {
      nom: sanitizeInput(nom),
      prenom: sanitizeInput(prenom),
      email: email.toLowerCase().trim(),
      telephone: telephone.replace(/[\s\-\.]/g, ''),
      adresse: sanitizeInput(adresse),
      codePostal: codePostal.trim(),
      ville: sanitizeInput(ville)
    };

    // Vérifier si l'utilisateur existe déjà dans la table users
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', sanitizedData.email)
      .single();
    if (existingUser) {
      return NextResponse.json(
        { message: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe déjà dans Supabase Auth
    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'Configuration serveur incomplète' },
        { status: 500 }
      );
    }

    // Vérifier si l'utilisateur existe déjà dans auth.users
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (!listError && listData) {
      const existingAuthUser = listData.users.find((u) => u.email?.toLowerCase() === sanitizedData.email.toLowerCase());
      if (existingAuthUser) {
        return NextResponse.json(
          { message: 'Cet email est déjà utilisé' },
          { status: 400 }
        );
      }
    }

    // Créer l'utilisateur dans Supabase Auth avec confirmation automatique de l'email
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: sanitizedData.email,
      password: password,
      email_confirm: true, // Confirmer automatiquement l'email
      user_metadata: {
        nom: sanitizedData.nom,
        prenom: sanitizedData.prenom,
        telephone: sanitizedData.telephone
      }
    });
    
    if (createError) {
      return NextResponse.json(
        { message: createError.message },
        { status: 400 }
      );
    }
    
    // Vérifier si l'utilisateur a été créé
    if (!authUser.user) {
      return NextResponse.json(
        { message: 'Erreur lors de la création du compte' },
        { status: 500 }
      );
    }

    // Ajouter les infos complémentaires dans la table users
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        nom: sanitizedData.nom,
        prenom: sanitizedData.prenom,
        email: sanitizedData.email,
        telephone: sanitizedData.telephone,
        adresse: sanitizedData.adresse,
        code_postal: sanitizedData.codePostal,
        ville: sanitizedData.ville,
        role: 'user',
      });
    if (insertError) {
      // Si l'insertion échoue, supprimer l'utilisateur Auth pour éviter les doublons
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id).catch(() => {});
      return NextResponse.json(
        { message: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Inscription réussie ! Votre compte a été créé et votre email est confirmé.' },
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
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
const { isValidEmail, validatePassword, sanitizeInput, isValidPhone, isValidPostalCode } = require('@/lib/validation');

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

    // Vérifier si l'utilisateur existe déjà
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

    // Créer l'utilisateur dans Supabase Auth avec redirection email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat-platform.vercel.app';
    const { data: authUser, error: signUpError } = await supabase.auth.signUp({
      email: sanitizedData.email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: {
          nom: sanitizedData.nom,
          prenom: sanitizedData.prenom,
          telephone: sanitizedData.telephone
        }
      }
    });
    if (signUpError) {
      return NextResponse.json(
        { message: signUpError.message },
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
    const { error: insertError } = await supabase
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
        role: 'customer',
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
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Récupérer le profil du livreur
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    // Vérifier l'utilisateur avec le token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Erreur auth:', authError);
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un livreur
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('❌ Erreur récupération utilisateur:', userError);
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    if (userData.role !== 'delivery') {
      return NextResponse.json({ error: 'Accès refusé - Rôle invalide' }, { status: 403 });
    }

    return NextResponse.json(userData);

  } catch (error) {
    console.error('❌ Erreur API profile:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Mettre à jour le profil du livreur
export async function PUT(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    // Vérifier l'utilisateur avec le token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Erreur auth:', authError);
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un livreur
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer les données à mettre à jour
    const body = await request.json();
    const { prenom, nom, telephone, adresse, photo_url } = body;

    // Mettre à jour le profil
    const updateData = {};
    if (prenom !== undefined) updateData.prenom = prenom;
    if (nom !== undefined) updateData.nom = nom;
    if (telephone !== undefined) updateData.telephone = telephone;
    if (adresse !== undefined) updateData.adresse = adresse;
    if (photo_url !== undefined) updateData.photo_url = photo_url;

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour profil:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    console.log('✅ Profil mis à jour avec succès');
    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('❌ Erreur API profile update:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


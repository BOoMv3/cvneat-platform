import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbqrvlmvnofaxbtcmsw.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Variables Supabase manquantes');
  }
  return createClient(url, key);
};

// Fonction pour vérifier le token et le rôle admin
const verifyAdminToken = async (request) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Non autorisé', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const supabaseAdmin = getSupabaseAdmin();
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return { error: 'Token invalide', status: 401 };
  }

  // Vérifier le rôle admin
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Accès refusé - Admin requis', status: 403 };
  }

  return { userId: user.id };
};

// POST /api/admin/reset-password - Réinitialiser le mot de passe d'un utilisateur
export async function POST(request) {
  const auth = await verifyAdminToken(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { email, newPassword } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    // Si un nouveau mot de passe est fourni, l'utiliser, sinon générer un mot de passe temporaire
    let passwordToSet;
    if (newPassword) {
      passwordToSet = newPassword;
    } else {
      // Générer un mot de passe temporaire sécurisé
      passwordToSet = Math.random().toString(36).slice(-12) + 
                      Math.random().toString(36).slice(-12).toUpperCase() + 
                      '!@#';
    }

    // Trouver l'utilisateur par email
    const normalizedEmail = email.toLowerCase().trim();
    const supabaseAdmin = getSupabaseAdmin();

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, nom, supabase_auth_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    let authRecord = null;

    if (!userData) {
      try {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (listError) {
          console.warn('⚠️ Erreur listUsers:', listError.message);
        } else {
          authRecord = listData.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
        }
      } catch (listErr) {
        console.warn('⚠️ Exception listUsers:', listErr.message);
      }

      if (!authRecord) {
        return NextResponse.json(
          { error: 'Utilisateur non trouvé avec cet email' },
          { status: 404 }
        );
      }
    }

    // Réinitialiser le mot de passe dans Supabase Auth
    const authId = userData?.supabase_auth_id || userData?.id || authRecord?.id;

    if (!authId) {
      return NextResponse.json(
        {
          error: 'Identifiant utilisateur introuvable',
          details: 'Impossible de déterminer l\'ID Auth Supabase pour cet utilisateur.'
        },
        { status: 500 }
      );
    }

    const { data: authData, error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      authId,
      { password: passwordToSet }
    );

    if (resetError) {
      console.error('❌ Erreur réinitialisation mot de passe:', resetError);
      return NextResponse.json(
        { 
          error: 'Erreur lors de la réinitialisation du mot de passe',
          details: resetError.message 
        },
        { status: 500 }
      );
    }

    console.log(`✅ Mot de passe réinitialisé pour: ${email} (${userData.id})`);

    return NextResponse.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
      email: (userData?.email || authRecord?.email || normalizedEmail),
      nom: userData?.nom || '',
      newPassword: passwordToSet, // Retourner le nouveau mot de passe pour l'admin
      warning: 'Conservez ce mot de passe en lieu sûr et communiquez-le au restaurant'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation du mot de passe:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la réinitialisation du mot de passe',
        details: error.message 
      },
      { status: 500 }
    );
  }
}


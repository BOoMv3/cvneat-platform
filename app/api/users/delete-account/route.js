import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbqrvlmvnofaxbtcmsw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function DELETE(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Supprimer l'utilisateur de la table users
    const { error: deleteUserError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteUserError) {
      console.error('Erreur suppression utilisateur:', deleteUserError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du compte' },
        { status: 500 }
      );
    }

    // Supprimer l'utilisateur de Supabase Auth (nécessite les droits admin)
    try {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (deleteAuthError) {
        console.error('Erreur suppression Auth:', deleteAuthError);
        // Ne pas échouer si la suppression Auth échoue, l'utilisateur est déjà supprimé de la table users
      }
    } catch (err) {
      console.error('Erreur lors de la suppression Auth:', err);
      // Continuer même si la suppression Auth échoue
    }

    return NextResponse.json({
      message: 'Compte supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur API suppression compte:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}


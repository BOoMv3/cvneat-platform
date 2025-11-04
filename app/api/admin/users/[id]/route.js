import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbqrvlmvnofaxbtcmsw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Fonction pour vérifier le token et le rôle admin
const verifyAdminToken = async (request) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Non autorisé', status: 401 };
  }

  const token = authHeader.split(' ')[1];
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
    return { error: 'Accès refusé', status: 403 };
  }

  return { userId: user.id };
};

// PUT /api/admin/users/[id]
export async function PUT(request, { params }) {
  const auth = await verifyAdminToken(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { name, email, phone, role } = await request.json();

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Tous les champs requis sont manquants' },
        { status: 400 }
      );
    }

    // Séparer nom et prénom depuis le champ name
    const nameParts = name.trim().split(' ');
    const prenom = nameParts[0] || '';
    const nom = nameParts.slice(1).join(' ') || nameParts[0] || '';

    // Vérifier si l'utilisateur existe
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    const { data: emailCheck, error: emailError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', params.id)
      .maybeSingle();

    if (emailCheck) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    // Mettre à jour l'utilisateur
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        nom,
        prenom,
        email,
        telephone: phone || null,
        role
      })
      .eq('id', params.id)
      .select('id, nom, prenom, email, telephone, role')
      .single();

    if (updateError) {
      console.error('Erreur mise à jour utilisateur:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de l\'utilisateur' },
        { status: 500 }
      );
    }

    // Formater la réponse pour le frontend
    return NextResponse.json({
      id: updatedUser.id,
      name: `${updatedUser.prenom || ''} ${updatedUser.nom || ''}`.trim() || updatedUser.email,
      email: updatedUser.email,
      phone: updatedUser.telephone || '',
      role: updatedUser.role
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'utilisateur' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(request, { params }) {
  const auth = await verifyAdminToken(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Vérifier si l'utilisateur existe
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer l'utilisateur
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Erreur suppression utilisateur:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de l\'utilisateur' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'utilisateur' },
      { status: 500 }
    );
  }
} 
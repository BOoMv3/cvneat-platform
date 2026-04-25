import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbqrvlmvnofaxbtcmsw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
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

    // Vérifier le rôle admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer tous les utilisateurs
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, nom, prenom, email, telephone, role, created_at, cvneat_plus_ends_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération utilisateurs:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // Formater les données pour le frontend
    const formattedUsers = (users || []).map((user) => {
      const endsAt = user.cvneat_plus_ends_at || null;
      const cvneatPlusActive = !!endsAt && new Date(endsAt).getTime() > Date.now();
      return {
        id: user.id,
        name: `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email,
        email: user.email,
        phone: user.telephone || '',
        role: user.role || 'user',
        created_at: user.created_at,
        cvneat_plus_ends_at: endsAt,
        cvneat_plus_active: cvneatPlusActive,
      };
    });

    return NextResponse.json(formattedUsers);

  } catch (error) {
    console.error('Erreur API admin users:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 
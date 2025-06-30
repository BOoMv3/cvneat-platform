import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET /api/admin/users - Récupérer la liste des utilisateurs
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const is_active = searchParams.get('is_active');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    let query = supabase
      .from('users')
      .select(`
        *,
        orders(count),
        loyalty_history(count)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (role) {
      query = query.eq('role', role);
    }
    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: users, error } = await query;

    if (error) throw error;

    return NextResponse.json(users || []);
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/admin/users - Créer un nouvel utilisateur (admin)
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { email, password, role, full_name } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Email, mot de passe et rôle requis' }, { status: 400 });
    }

    // Créer l'utilisateur dans Supabase Auth
    const { data: authUser, error: authCreateError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role
      }
    });

    if (authCreateError) throw authCreateError;

    // Créer l'utilisateur dans la table users
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .insert([{
        id: authUser.user.id,
        email,
        role,
        full_name,
        is_active: true,
        points_fidelite: 0,
        loyalty_level: 'Bronze'
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    // Envoyer email de bienvenue avec les identifiants
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'welcomeUser',
          data: {
            email,
            full_name,
            role,
            password
          },
          recipientEmail: email
        })
      });
    } catch (emailError) {
      console.error('Erreur envoi email bienvenue:', emailError);
    }

    return NextResponse.json({
      success: true,
      user: dbUser,
      message: 'Utilisateur créé avec succès'
    });
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
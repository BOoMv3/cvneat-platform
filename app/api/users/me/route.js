import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Email',
  'Access-Control-Max-Age': '86400',
};

function json(body, init) {
  const res = NextResponse.json(body, init);
  for (const [k, v] of Object.entries(corsHeaders)) {
    res.headers.set(k, v);
  }
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request) {
  try {
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // IMPORTANT:
    // Sur mobile (Capacitor) et pour les comptes créés via admin/scripts, il arrive que:
    // - l'utilisateur existe dans auth.users
    // - mais qu'il n'existe pas (encore) dans la table public.users
    // Cela casse la récupération du rôle, les dashboards, et redirige vers /login.

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      return json({ error: 'Configuration serveur incomplète' }, { status: 500 });
    }

    // Client admin (bypass RLS) + vérification du token utilisateur
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return json({ error: 'Token invalide' }, { status: 401 });
    }

    // Récupérer le profil depuis la table users via le client admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    let finalUser = userData;

    // Si absent: créer un profil minimal (évite "Utilisateur non trouvé" partout)
    if (!finalUser) {
      const allowedRoles = new Set(['user', 'admin', 'restaurant', 'delivery']);

      let inferredRole = allowedRoles.has(user.user_metadata?.role) ? user.user_metadata.role : null;

      // Heuristique: si un restaurant existe pour ce user_id, c'est un partenaire restaurant
      if (!inferredRole) {
        const { data: restaurantMatch } = await supabaseAdmin
          .from('restaurants')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (restaurantMatch) inferredRole = 'restaurant';
      }

      // Heuristique: si des stats livreur existent, c'est un livreur
      if (!inferredRole) {
        const { data: deliveryStatsMatch } = await supabaseAdmin
          .from('delivery_stats')
          .select('delivery_id')
          .eq('delivery_id', user.id)
          .maybeSingle();
        if (deliveryStatsMatch) inferredRole = 'delivery';
      }

      if (!inferredRole) inferredRole = 'user';

      const minimalProfile = {
        id: user.id,
        email: (user.email || '').toLowerCase(),
        nom: user.user_metadata?.nom || user.user_metadata?.last_name || 'Utilisateur',
        prenom: user.user_metadata?.prenom || user.user_metadata?.first_name || '',
        telephone: user.user_metadata?.telephone || user.user_metadata?.phone || '0000000000',
        adresse: 'Adresse non renseignée',
        code_postal: '00000',
        ville: 'Ville non renseignée',
        role: inferredRole,
      };

      const { data: insertedUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert(minimalProfile)
        .select('*')
        .single();

      if (insertError) {
        // Si l'insertion échoue (schéma différent / contraintes), on renvoie quand même un profil minimal exploitable
        finalUser = minimalProfile;
      } else {
        finalUser = insertedUser;
      }
    } else if (!finalUser.role) {
      // Si le profil existe mais sans role, le fixer au minimum
      await supabaseAdmin.from('users').update({ role: 'user' }).eq('id', user.id).catch(() => {});
      finalUser = { ...finalUser, role: 'user' };
    }

    // Retourner les données formatées correctement
    // Construire le nom complet avec prénom et nom, ou utiliser l'email si les deux sont vides
    const fullName = `${finalUser.prenom || ''} ${finalUser.nom || ''}`.trim();
    const displayName = fullName || finalUser.email || user.email;
    
    return json({
      id: finalUser.id,
      email: finalUser.email || user.email,
      name: displayName,
      nom: finalUser.nom || '',
      prenom: finalUser.prenom || '',
      phone: finalUser.telephone || '',
      role: finalUser.role || 'user',
      created_at: finalUser.created_at || user.created_at
    });

  } catch (error) {
    console.error('Erreur dans /api/users/me:', error);
    return json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    console.log('Utilisateur Supabase Auth:', user);

    // Récupérer les informations utilisateur depuis la table users (par email)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    console.log('Données utilisateur depuis la table users:', userData, 'Erreur:', userError);

    if (userError) {
      console.error('Erreur lors de la récupération des données utilisateur:', userError);
      
      // Si l'utilisateur n'existe pas dans la table users, créer un enregistrement de base
      if (userError.code === 'PGRST116') {
        console.log('Utilisateur non trouvé dans la table users, création d\'un enregistrement de base...');
        
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            email: user.email,
            nom: user.user_metadata?.name || user.email.split('@')[0],
            prenom: user.user_metadata?.first_name || 'Utilisateur',
            telephone: user.user_metadata?.phone || '0000000000',
            adresse: user.user_metadata?.address || 'Adresse non renseignée',
            code_postal: user.user_metadata?.postal_code || '00000',
            ville: user.user_metadata?.city || 'Ville non renseignée',
            password: 'password123', // Mot de passe par défaut
            role: user.email.includes('livreur') ? 'delivery' : 'user'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Erreur lors de la création de l\'utilisateur:', insertError);
          // Retourner les données de base même si l'insertion échoue
          return NextResponse.json({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email,
            phone: user.user_metadata?.phone || '',
            created_at: user.created_at
          });
        }

        return NextResponse.json({
          id: newUser.id,
          email: newUser.email,
          name: newUser.nom,
          phone: newUser.telephone,
          created_at: newUser.created_at
        });
      }
      
      // Pour d'autres erreurs, retourner les données de base
      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
        phone: user.user_metadata?.phone || '',
        created_at: user.created_at
      });
    }

    // Retourner les données formatées correctement
    return NextResponse.json({
      id: userData.id,
      email: userData.email || user.email,
      name: userData.nom || `${userData.prenom || ''} ${userData.nom || ''}`.trim() || user.email,
      phone: userData.telephone || userData.phone || '',
      created_at: userData.created_at || user.created_at
    });

  } catch (error) {
    console.error('Erreur dans /api/users/me:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
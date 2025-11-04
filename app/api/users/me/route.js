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
        
        // Ne pas créer automatiquement d'utilisateur pour éviter les doublons
        // Si l'utilisateur n'existe pas, c'est qu'il doit compléter son inscription
        console.warn('Utilisateur Auth trouvé mais pas dans la table users. L\'utilisateur doit compléter son inscription.');
        return NextResponse.json({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.prenom && user.user_metadata?.nom 
            ? `${user.user_metadata.prenom} ${user.user_metadata.nom}`.trim()
            : user.email,
          nom: user.user_metadata?.nom || '',
          prenom: user.user_metadata?.prenom || '',
          phone: user.user_metadata?.telephone || '',
          created_at: user.created_at,
          needsCompletion: true // Indiquer que le profil doit être complété
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
    // Construire le nom complet avec prénom et nom, ou utiliser l'email si les deux sont vides
    const fullName = `${userData.prenom || ''} ${userData.nom || ''}`.trim();
    const displayName = fullName || userData.email || user.email;
    
    return NextResponse.json({
      id: userData.id,
      email: userData.email || user.email,
      name: displayName,
      nom: userData.nom || '',
      prenom: userData.prenom || '',
      phone: userData.telephone || '',
      created_at: userData.created_at || user.created_at
    });

  } catch (error) {
    console.error('Erreur dans /api/users/me:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
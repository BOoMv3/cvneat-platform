import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    // Vérifier l'authentification admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé - Admin requis' }, { status: 403 });
    }

    // Récupérer les données de la requête
    const requestData = await request.json();
    const { email, nom, description, adresse, ville, code_postal, telephone } = requestData;

    // Utiliser un client admin pour contourner les RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vérifier si l'utilisateur existe dans Supabase Auth
    let userToUpdate = null;
    let userId = null;

    // 1. Chercher dans Supabase Auth d'abord
    const { data: { users: authUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (!listError && authUsers) {
      const authUser = authUsers.find(u => u.email === email);
      if (authUser) {
        userId = authUser.id;
        console.log('👤 Utilisateur trouvé dans Auth:', authUser.id);
      }
    }

    // 2. Si pas trouvé dans Auth, chercher dans la table users
    if (!userId) {
      const { data: userFromTable, error: userError2 } = await supabaseAdmin
        .from('users')
        .select('id, role, email')
        .eq('email', email)
        .single();

      if (!userError2 && userFromTable) {
        userId = userFromTable.id;
        userToUpdate = userFromTable;
        console.log('👤 Utilisateur trouvé dans table users:', userFromTable.id);
      }
    }

    // 3. Si l'utilisateur n'existe toujours pas, créer un compte automatiquement
    if (!userId) {
      console.log('🔵 Création automatique du compte utilisateur pour:', email);
      
      // Générer un mot de passe temporaire
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '!@#';
      
      // Créer l'utilisateur dans Supabase Auth
      const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true, // Confirmer automatiquement l'email
        user_metadata: {
          nom: nom,
          prenom: '',
          telephone: telephone
        }
      });

      if (createAuthError || !newAuthUser) {
        console.error('❌ Erreur création utilisateur Auth:', createAuthError);
        return NextResponse.json({ 
          error: `Erreur lors de la création du compte utilisateur: ${createAuthError?.message || 'Erreur inconnue'}` 
        }, { status: 500 });
      }

      userId = newAuthUser.user.id;
      console.log('✅ Utilisateur créé dans Auth:', userId);

      // Créer l'entrée dans la table users
      const { data: newUser, error: createUserError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: email,
          nom: nom,
          prenom: '',
          telephone: telephone,
          adresse: adresse || 'Adresse non renseignée',
          code_postal: code_postal || '00000',
          ville: ville || 'Ville non renseignée',
          role: 'restaurant' // Définir directement le rôle restaurant
        })
        .select()
        .single();

      if (createUserError) {
        console.error('❌ Erreur création utilisateur dans table:', createUserError);
        // Ne pas faire échouer, on peut continuer avec userId
      } else {
        userToUpdate = newUser;
        console.log('✅ Utilisateur créé dans table users:', newUser);
      }
    } else {
      // L'utilisateur existe, récupérer ses infos
      if (!userToUpdate) {
        const { data: userData, error: fetchError } = await supabaseAdmin
          .from('users')
          .select('id, role, email')
          .eq('id', userId)
          .maybeSingle();
        
        if (!fetchError && userData) {
          userToUpdate = userData;
        }
      }
    }

    // 4. Mettre à jour le rôle de l'utilisateur pour qu'il soit "restaurant" (même si déjà créé avec ce rôle)
    console.log('🔄 Mise à jour du rôle utilisateur:', {
      userId: userId,
      email: email,
      roleActuel: userToUpdate?.role,
      nouveauRole: 'restaurant'
    });

    // Vérifier d'abord que l'utilisateur existe dans la table users
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, role, email')
      .eq('id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Erreur vérification utilisateur:', checkError);
      return NextResponse.json({ 
        error: `Erreur lors de la vérification de l'utilisateur: ${checkError.message}` 
      }, { status: 500 });
    }

    if (!existingUser) {
      console.warn('⚠️ Utilisateur non trouvé dans la table users, création...');
      // Créer l'utilisateur dans la table users
      const { data: newUser, error: createUserError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: email,
          nom: nom,
          prenom: '',
          telephone: telephone,
          adresse: adresse || 'Adresse non renseignée',
          code_postal: code_postal || '00000',
          ville: ville || 'Ville non renseignée',
          role: 'restaurant'
        })
        .select()
        .single();

      if (createUserError) {
        console.error('❌ Erreur création utilisateur:', createUserError);
        return NextResponse.json({ 
          error: `Erreur lors de la création de l'utilisateur: ${createUserError.message}` 
        }, { status: 500 });
      }

      console.log('✅ Utilisateur créé avec rôle restaurant:', newUser);
    } else {
      // L'utilisateur existe, mettre à jour le rôle
      const { data: updatedUser, error: roleError } = await supabaseAdmin
        .from('users')
        .update({ role: 'restaurant' })
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (roleError) {
        console.error('❌ Erreur mise à jour rôle:', roleError);
        return NextResponse.json({ 
          error: `Erreur lors de la mise à jour du rôle: ${roleError.message}` 
        }, { status: 500 });
      }

      if (!updatedUser) {
        console.warn('⚠️ Aucune ligne mise à jour (utilisateur peut-être supprimé)');
        // Essayer de créer l'utilisateur
        const { data: newUser, error: createUserError } = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            email: email,
            nom: nom,
            prenom: '',
            telephone: telephone,
            adresse: adresse || 'Adresse non renseignée',
            code_postal: code_postal || '00000',
            ville: ville || 'Ville non renseignée',
            role: 'restaurant'
          })
          .select()
          .single();

        if (createUserError) {
          console.error('❌ Erreur création utilisateur (fallback):', createUserError);
          return NextResponse.json({ 
            error: `Erreur lors de la création de l'utilisateur: ${createUserError.message}` 
          }, { status: 500 });
        }

        console.log('✅ Utilisateur créé (fallback) avec rôle restaurant:', newUser);
      } else {
        console.log('✅ Rôle mis à jour à "restaurant":', updatedUser);
      }
    }
    
    // Vérifier que le rôle est bien mis à jour
    const { data: verifyUser, error: verifyUserError } = await supabaseAdmin
      .from('users')
      .select('id, role, email')
      .eq('id', userId)
      .maybeSingle();
    
    if (verifyUserError) {
      console.error('⚠️ ATTENTION: Erreur lors de la vérification du rôle:', verifyUserError);
    } else if (!verifyUser) {
      console.error('⚠️ ATTENTION: Utilisateur non trouvé après mise à jour');
    } else {
      console.log('✅ Vérification: Rôle confirmé:', verifyUser.role);
      if (verifyUser.role !== 'restaurant') {
        console.error('❌ PROBLÈME: Le rôle n\'a pas été mis à jour correctement!');
      }
    }

    // 2. Créer le restaurant avec le client admin
    console.log('📝 Création restaurant avec données:', {
      user_id: userId,
      nom,
      email,
      ville,
      code_postal
    });

    const restaurantInsertData = {
      user_id: userId,
      nom: nom,
      description: description || 'Restaurant partenaire CVN\'Eat',
      adresse: adresse,
      ville: ville,
      code_postal: code_postal,
      telephone: telephone,
      email: email,
      frais_livraison: 2.50,
      minimum_order: 10.00,
      delivery_time: 30,
      rating: 4.5,
      image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop',
      horaires: {
        lundi: { ouvert: true, plages: [{ ouverture: '11:00', fermeture: '22:00' }] },
        mardi: { ouvert: true, plages: [{ ouverture: '11:00', fermeture: '22:00' }] },
        mercredi: { ouvert: true, plages: [{ ouverture: '11:00', fermeture: '22:00' }] },
        jeudi: { ouvert: true, plages: [{ ouverture: '11:00', fermeture: '22:00' }] },
        vendredi: { ouvert: true, plages: [{ ouverture: '11:00', fermeture: '23:00' }] },
        samedi: { ouvert: true, plages: [{ ouverture: '11:00', fermeture: '23:00' }] },
        dimanche: { ouvert: true, plages: [{ ouverture: '12:00', fermeture: '21:00' }] }
      },
      disponible: true
    };

    console.log('📤 Insertion restaurant dans la base de données...');
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .insert(restaurantInsertData)
      .select()
      .single();

    if (restaurantError) {
      console.error('❌ Erreur création restaurant:', restaurantError);
      console.error('❌ Détails erreur:', {
        code: restaurantError.code,
        message: restaurantError.message,
        details: restaurantError.details,
        hint: restaurantError.hint
      });
      return NextResponse.json({ 
        error: `Erreur lors de la création du restaurant: ${restaurantError.message}`,
        details: restaurantError.details,
        hint: restaurantError.hint
      }, { status: 500 });
    }

    if (!restaurantData) {
      console.error('❌ Restaurant créé mais aucune donnée retournée');
      return NextResponse.json({ 
        error: 'Restaurant créé mais aucune donnée retournée'
      }, { status: 500 });
    }

    console.log('✅ Restaurant créé avec succès:', {
      id: restaurantData.id,
      nom: restaurantData.nom,
      user_id: restaurantData.user_id
    });

    // Vérifier que le restaurant existe bien dans la base
    const { data: verifyRestaurant, error: verifyError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', restaurantData.id)
      .single();

    if (verifyError || !verifyRestaurant) {
      console.error('⚠️ ATTENTION: Restaurant créé mais non trouvé lors de la vérification:', verifyError);
    } else {
      console.log('✅ Vérification: Restaurant confirmé dans la base:', verifyRestaurant.id);
    }

    return NextResponse.json({ 
      success: true, 
      restaurant: restaurantData 
    });

  } catch (error) {
    console.error('❌ Erreur API création restaurant:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur' 
    }, { status: 500 });
  }
}


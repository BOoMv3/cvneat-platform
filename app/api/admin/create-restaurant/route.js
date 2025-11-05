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

    // Récupérer l'utilisateur associé à cette demande (par email)
    const { data: userToUpdate, error: userError2 } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('email', email)
      .single();

    if (userError2 || !userToUpdate) {
      return NextResponse.json({ 
        error: `Utilisateur non trouvé pour l'email: ${email}. Veuillez d'abord créer le compte utilisateur.` 
      }, { status: 404 });
    }

    console.log('👤 Utilisateur trouvé:', userToUpdate);

    // 1. Mettre à jour le rôle de l'utilisateur pour qu'il soit "restaurant"
    const { error: roleError } = await supabaseAdmin
      .from('users')
      .update({ role: 'restaurant' })
      .eq('id', userToUpdate.id);

    if (roleError) {
      console.error('❌ Erreur mise à jour rôle:', roleError);
      return NextResponse.json({ 
        error: `Erreur lors de la mise à jour du rôle: ${roleError.message}` 
      }, { status: 500 });
    }

    console.log('✅ Rôle mis à jour à "restaurant"');

    // 2. Créer le restaurant avec le client admin
    console.log('📝 Création restaurant avec données:', {
      user_id: userToUpdate.id,
      nom,
      email,
      ville,
      code_postal
    });

    const restaurantInsertData = {
      user_id: userToUpdate.id,
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

    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .insert(restaurantInsertData)
      .select()
      .single();

    if (restaurantError) {
      console.error('❌ Erreur création restaurant:', restaurantError);
      return NextResponse.json({ 
        error: `Erreur lors de la création du restaurant: ${restaurantError.message}` 
      }, { status: 500 });
    }

    console.log('✅ Restaurant créé avec succès:', restaurantData);
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


import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminWriterRole } from '@/lib/admin-viewer';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !isAdminWriterRole(userData.role)) {
      return NextResponse.json({ error: 'Accès refusé - Rôle admin requis' }, { status: 403 });
    }

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Récupérer les paramètres (email, nom du livreur ou ID)
    const body = await request.json();
    const deliveryEmail = body.email;
    const deliveryName = body.name || 'théo';
    const deliveryId = body.delivery_id;

    let theo;

    if (deliveryId) {
      // Si un ID est fourni, l'utiliser directement
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, nom, prenom, email, role')
        .eq('id', deliveryId)
        .eq('role', 'delivery')
        .single();
      
      if (error || !user) {
        return NextResponse.json({ error: 'Livreur non trouvé' }, { status: 404 });
      }
      theo = user;
    } else if (deliveryEmail) {
      // Rechercher par email (priorité)
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, nom, prenom, email, role')
        .eq('email', deliveryEmail)
        .eq('role', 'delivery')
        .single();
      
      if (error || !user) {
        return NextResponse.json({ error: `Livreur non trouvé avec l'email ${deliveryEmail}` }, { status: 404 });
      }
      theo = user;
    } else {
      // Rechercher par nom
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, nom, prenom, email, role')
        .or(`nom.ilike.%${deliveryName}%,prenom.ilike.%${deliveryName}%`)
        .eq('role', 'delivery');
      
      if (usersError || !users || users.length === 0) {
        return NextResponse.json({ error: 'Livreur non trouvé' }, { status: 404 });
      }
      
      theo = users[0];
    }

    console.log(`📝 Remise à zéro du compte de: ${theo.prenom} ${theo.nom} (${theo.email})`);

    // Vérifier les stats actuelles
    const { data: existingStats } = await supabaseAdmin
      .from('delivery_stats')
      .select('*')
      .eq('delivery_id', theo.id)
      .single();

    const oldEarnings = existingStats?.total_earnings || 0;

    // ÉTAPE 1: Marquer toutes les commandes livrées comme payées
    const { error: markPaidError } = await supabaseAdmin
      .from('commandes')
      .update({
        livreur_paid_at: new Date().toISOString()
      })
      .eq('livreur_id', theo.id)
      .eq('statut', 'livree')
      .is('livreur_paid_at', null);

    if (markPaidError) {
      console.error('Erreur marquage commandes payées:', markPaidError);
      // Continuer quand même si la colonne n'existe pas encore
    }

    // ÉTAPE 2: Mettre à jour ou créer les stats
    if (existingStats) {
      const { error: updateError } = await supabaseAdmin
        .from('delivery_stats')
        .update({
          total_earnings: 0,
          last_month_earnings: 0,
          updated_at: new Date().toISOString()
        })
        .eq('delivery_id', theo.id);
      
      if (updateError) {
        console.error('Erreur mise à jour:', updateError);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('delivery_stats')
        .insert({
          delivery_id: theo.id,
          total_earnings: 0,
          last_month_earnings: 0,
          total_deliveries: existingStats?.total_deliveries || 0,
          average_rating: existingStats?.average_rating || 0,
          total_distance_km: existingStats?.total_distance_km || 0,
          total_time_hours: existingStats?.total_time_hours || 0
        });
      
      if (insertError) {
        console.error('Erreur création:', insertError);
        return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
      }
    }

    // Vérifier le résultat
    const { data: updatedStats } = await supabaseAdmin
      .from('delivery_stats')
      .select('*')
      .eq('delivery_id', theo.id)
      .single();

    return NextResponse.json({
      success: true,
      message: `Compte de ${theo.prenom} ${theo.nom} remis à 0`,
      delivery: {
        id: theo.id,
        nom: theo.nom,
        prenom: theo.prenom,
        email: theo.email
      },
      old_earnings: oldEarnings,
      new_earnings: updatedStats?.total_earnings || 0
    });

  } catch (error) {
    console.error('Erreur API reset delivery account:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_CONFIRMATION = 'RÉINITIALISER TOUT';

export async function POST(request) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
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

    // Vérifier l'utilisateur
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier le rôle admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: userData, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé - Admin requis' }, { status: 403 });
    }

    // Vérifier la confirmation
    const { confirmation } = await request.json();
    if (confirmation !== REQUIRED_CONFIRMATION) {
      return NextResponse.json({ error: 'Confirmation invalide' }, { status: 400 });
    }

    console.log(`🔄 Réinitialisation du site demandée par l'admin: ${user.email} (${user.id})`);

    // Compter avant suppression pour le rapport
    const counts = {
      commandes: 0,
      details_commande: 0,
      livraisons: 0,
      reclamations: 0,
      delivery_stats: 0,
      customer_complaint_history: 0
    };

    try {
      const commandesCount = await supabaseAdmin
        .from('commandes')
        .select('id', { count: 'exact', head: true });
      counts.commandes = commandesCount.count || 0;

      const detailsCount = await supabaseAdmin
        .from('details_commande')
        .select('id', { count: 'exact', head: true });
      counts.details_commande = detailsCount.count || 0;

      try {
        const livraisonsCount = await supabaseAdmin
          .from('livraisons')
          .select('id', { count: 'exact', head: true });
        counts.livraisons = livraisonsCount.count || 0;
      } catch (e) {
        console.warn('Table livraisons non trouvée ou erreur:', e);
      }

      try {
        const reclamationsCount = await supabaseAdmin
          .from('reclamations')
          .select('id', { count: 'exact', head: true });
        counts.reclamations = reclamationsCount.count || 0;
      } catch (e) {
        console.warn('Table reclamations non trouvée ou erreur:', e);
      }

      // Compter les statistiques de livraison
      try {
        const deliveryStatsCount = await supabaseAdmin
          .from('delivery_stats')
          .select('id', { count: 'exact', head: true });
        counts.delivery_stats = deliveryStatsCount.count || 0;
      } catch (e) {
        console.warn('Table delivery_stats non trouvée ou erreur:', e);
      }

      // Compter l'historique des réclamations clients
      try {
        const complaintHistoryCount = await supabaseAdmin
          .from('customer_complaint_history')
          .select('id', { count: 'exact', head: true });
        counts.customer_complaint_history = complaintHistoryCount.count || 0;
      } catch (e) {
        console.warn('Table customer_complaint_history non trouvée ou erreur:', e);
      }
    } catch (e) {
      console.error('Erreur lors du comptage:', e);
    }

    // Supprimer dans l'ordre (respecter les foreign keys)
    const errors = [];

    // 1. Détails de commandes (dépend de commandes)
    try {
      const { error: detailsError } = await supabaseAdmin
        .from('details_commande')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tout
      
      if (detailsError) {
        console.error('Erreur suppression details_commande:', detailsError);
        errors.push('details_commande');
      }
    } catch (e) {
      console.error('Exception suppression details_commande:', e);
      errors.push('details_commande');
    }

    // 2. Commandes (peut référencer livraisons)
    try {
      const { error: commandesError } = await supabaseAdmin
        .from('commandes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tout
      
      if (commandesError) {
        console.error('Erreur suppression commandes:', commandesError);
        errors.push('commandes');
      }
    } catch (e) {
      console.error('Exception suppression commandes:', e);
      errors.push('commandes');
    }

    // 3. Livraisons (si la table existe)
    try {
      const { error: livraisonsError } = await supabaseAdmin
        .from('livraisons')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (livraisonsError) {
        console.warn('Erreur suppression livraisons (peut ne pas exister):', livraisonsError);
      }
    } catch (e) {
      console.warn('Table livraisons non trouvée ou erreur:', e);
    }

    // 4. Réclamations (si la table existe)
    try {
      const { error: reclamationsError } = await supabaseAdmin
        .from('reclamations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (reclamationsError) {
        console.warn('Erreur suppression reclamations (peut ne pas exister):', reclamationsError);
      }
    } catch (e) {
      console.warn('Table reclamations non trouvée ou erreur:', e);
    }

    // 5. Statistiques de livraison (réinitialiser tous les gains et totaux)
    try {
      const { error: deliveryStatsError } = await supabaseAdmin
        .from('delivery_stats')
        .update({
          total_earnings: 0,
          total_deliveries: 0,
          average_rating: 0,
          last_month_earnings: 0,
          total_distance_km: 0,
          total_time_hours: 0,
          updated_at: new Date().toISOString()
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deliveryStatsError) {
        console.warn('Erreur réinitialisation delivery_stats (peut ne pas exister):', deliveryStatsError);
        // Si la mise à jour échoue, essayer de supprimer
        try {
          await supabaseAdmin.from('delivery_stats').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (deleteError) {
          console.warn('Impossible de supprimer delivery_stats:', deleteError);
        }
      }
    } catch (e) {
      console.warn('Table delivery_stats non trouvée ou erreur:', e);
    }

    // 6. Historique des réclamations clients (réinitialiser les totaux)
    try {
      const { error: complaintHistoryError } = await supabaseAdmin
        .from('customer_complaint_history')
        .update({
          total_complaints: 0,
          total_refunded: 0,
          last_complaint_date: null,
          updated_at: new Date().toISOString()
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (complaintHistoryError) {
        console.warn('Erreur réinitialisation customer_complaint_history (peut ne pas exister):', complaintHistoryError);
        // Si la mise à jour échoue, essayer de supprimer
        try {
          await supabaseAdmin.from('customer_complaint_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (deleteError) {
          console.warn('Impossible de supprimer customer_complaint_history:', deleteError);
        }
      }
    } catch (e) {
      console.warn('Table customer_complaint_history non trouvée ou erreur:', e);
    }

    if (errors.length > 0) {
      console.error('Erreurs lors de la suppression:', errors);
      return NextResponse.json({ 
        error: 'Erreurs lors de la suppression: ' + errors.join(', '),
        deletedCounts: counts
      }, { status: 500 });
    }

    console.log(`✅ Réinitialisation réussie. Supprimé: ${JSON.stringify(counts)}`);

    return NextResponse.json({
      success: true,
      message: 'Réinitialisation réussie',
      deletedCounts: counts
    });
  } catch (error) {
    console.error('Erreur réinitialisation:', error);
    return NextResponse.json({ error: 'Erreur serveur: ' + error.message }, { status: 500 });
  }
}


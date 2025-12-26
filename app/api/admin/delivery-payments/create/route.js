import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const verifyAdminToken = async (request) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Essayer avec les cookies
    const token = request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
    if (!token) {
      return { error: 'Non autorisé', status: 401 };
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return { error: 'Token invalide', status: 401 };
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return { error: 'Accès refusé - Admin requis', status: 403 };
    }

    return { userId: user.id };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return { error: 'Token invalide', status: 401 };
  }

  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Accès refusé - Admin requis', status: 403 };
  }

  return { userId: user.id };
};

export async function POST(request) {
  try {
    const auth = await verifyAdminToken(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      delivery_id,
      delivery_name,
      delivery_email,
      amount,
      transfer_date,
      reference_number,
      period_start,
      period_end,
      notes
    } = body;

    // Validation
    if (!delivery_id || !amount || !transfer_date) {
      return NextResponse.json(
        { error: 'delivery_id, amount et transfer_date sont requis' },
        { status: 400 }
      );
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Le montant doit être supérieur à 0' },
        { status: 400 }
      );
    }

    // Vérifier que le livreur existe
    const { data: driver, error: driverError } = await supabaseAdmin
      .from('users')
      .select('id, nom, prenom, email, role')
      .eq('id', delivery_id)
      .eq('role', 'delivery')
      .single();

    if (driverError || !driver) {
      return NextResponse.json(
        { error: 'Livreur non trouvé' },
        { status: 404 }
      );
    }

    // Créer l'enregistrement de paiement
    const { data: transfer, error: transferError } = await supabaseAdmin
      .from('delivery_transfers')
      .insert({
        delivery_id,
        delivery_name: delivery_name || `${driver.prenom || ''} ${driver.nom || ''}`.trim() || driver.email,
        delivery_email: delivery_email || driver.email,
        amount: parseFloat(amount),
        transfer_date,
        reference_number: reference_number || null,
        period_start: period_start || null,
        period_end: period_end || null,
        notes: notes || null,
        status: 'completed',
        created_by: auth.userId
      })
      .select()
      .single();

    if (transferError) {
      console.error('Erreur création transfer:', transferError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du paiement', details: transferError.message },
        { status: 500 }
      );
    }

    // Marquer les commandes comme payées (les plus anciennes d'abord jusqu'à atteindre le montant)
    // IMPORTANT: Cela met à jour automatiquement TOUS les dashboards des livreurs
    // car l'API /api/delivery/stats (utilisée par les dashboards) filtre avec livreur_paid_at IS NULL
    // Donc quand on marque les commandes comme payées, les gains affichés diminuent automatiquement
    const montantCible = parseFloat(amount);
    let totalMarque = 0;

    // Récupérer les commandes non payées dans l'ordre chronologique
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select('id, frais_livraison, created_at')
      .eq('livreur_id', delivery_id)
      .eq('statut', 'livree')
      .is('livreur_paid_at', null)
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('Erreur récupération commandes:', ordersError);
      // Ne pas échouer si on ne peut pas marquer les commandes, le paiement est quand même enregistré
    } else if (orders && orders.length > 0) {
      // Marquer les commandes jusqu'à atteindre le montant
      const ordersToMark = [];
      for (const order of orders) {
        const fraisLivraison = parseFloat(order.frais_livraison || 0);
        if (totalMarque + fraisLivraison <= montantCible) {
          ordersToMark.push(order.id);
          totalMarque += fraisLivraison;
        } else {
          break;
        }
      }

      if (ordersToMark.length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('commandes')
          .update({ livreur_paid_at: new Date().toISOString() })
          .in('id', ordersToMark);

        if (updateError) {
          console.error('Erreur mise à jour commandes:', updateError);
          // Ne pas échouer, le paiement est quand même enregistré
        } else {
          console.log(`✅ ${ordersToMark.length} commande(s) marquée(s) comme payée(s) pour un total de ${totalMarque.toFixed(2)}€`);
          console.log(`✅ Le dashboard du livreur sera automatiquement mis à jour (les gains ne compteront plus ces commandes)`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      transfer,
      orders_marked: ordersToMark?.length || 0,
      amount_marked: totalMarque,
      message: `Paiement enregistré. ${ordersToMark?.length || 0} commande(s) marquée(s) comme payée(s). Le dashboard du livreur sera automatiquement mis à jour.`
    });

  } catch (error) {
    console.error('Erreur API création paiement livreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}


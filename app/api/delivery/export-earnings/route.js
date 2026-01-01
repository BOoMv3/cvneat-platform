import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import json2csv from 'json2csv';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = 'current-user-id'; // À remplacer par l'ID réel
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Construire la requête
    let query = supabase
      .from('commandes')
      .select(`
        id,
        montant_total,
        frais_livraison,
        delivery_commission_cvneat,
        statut,
        created_at,
        restaurants(nom),
        users(nom, prenom)
      `)
      .eq('livreur_id', deliveryId)
      .eq('statut', 'livree')
      .order('created_at', { ascending: false });

    // Appliquer les filtres de date
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Erreur récupération gains:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des gains' },
        { status: 500 }
      );
    }

    // Calculer les totaux (utiliser le gain réel du livreur = frais_livraison - commission)
    const totalEarnings = orders?.reduce((sum, order) => {
      const fraisLivraison = parseFloat(order.frais_livraison || 0);
      const commission = parseFloat(order.delivery_commission_cvneat || 0);
      const livreurEarning = fraisLivraison - commission; // Gain réel du livreur
      return sum + livreurEarning;
    }, 0) || 0;
    const totalDeliveries = orders?.length || 0;
    const averageEarning = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0;

    // Générer le CSV
    const headers = [
      'Date',
      'ID Commande',
      'Restaurant',
      'Client',
      'Total Commande',
      'Frais Livraison',
      'Statut'
    ];

    const csvContent = [
      headers.join(','),
      ...orders?.map(order => [
        new Date(order.created_at).toLocaleDateString('fr-FR'),
        order.id,
        `"${order.restaurants?.nom || 'Restaurant inconnu'}"`,
        `"${order.users?.prenom || ''} ${order.users?.nom || ''}"`.trim(),
        order.montant_total,
        order.frais_livraison,
        order.statut
      ].join(',')) || [],
      '', // Ligne vide
      'Résumé',
      `Total livraisons,${totalDeliveries}`,
      `Total gains,${totalEarnings.toFixed(2)}€`,
      `Gain moyen,${averageEarning.toFixed(2)}€`
    ].join('\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="gains_livreur_${new Date().toISOString().split('T')[0]}.csv"`,
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Erreur API export gains:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 
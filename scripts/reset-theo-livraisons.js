/**
 * Script pour remettre à zéro les livraisons de Théo (sauf hier soir)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetTheoLivraisons() {
  // Trouver le livreur Théo
  const { data: livreurs, error: livreurError } = await supabase
    .from('users')
    .select('id, prenom, nom, email')
    .eq('email', 'theo@cvneat.fr');

  if (livreurError) {
    console.error('Erreur recherche livreur:', livreurError);
    return;
  }

  console.log('Livreurs trouvés:', livreurs);

  if (!livreurs || livreurs.length === 0) {
    console.log('Aucun livreur Théo trouvé');
    return;
  }

  const theo = livreurs[0];
  console.log(`\nLivreur trouvé: ${theo.prenom} ${theo.nom} (${theo.email})`);
  console.log('ID:', theo.id);

  // Date d'hier soir (26 novembre 2024 à partir de 18h)
  const hierSoir = new Date('2025-11-26T18:00:00Z');
  console.log('\nDate limite (garder après):', hierSoir.toISOString());

  // Récupérer toutes les livraisons de Théo
  const { data: livraisons, error: livError } = await supabase
    .from('commandes')
    .select('id, created_at, total, frais_livraison, statut')
    .eq('livreur_id', theo.id)
    .eq('statut', 'livree')
    .order('created_at', { ascending: false });

  if (livError) {
    console.error('Erreur récupération livraisons:', livError);
    return;
  }

  console.log(`\nTotal livraisons trouvées: ${livraisons?.length || 0}`);

  // Séparer les livraisons à garder et celles à retirer du livreur (payées)
  const aGarder = [];
  const aPayer = [];

  livraisons?.forEach(liv => {
    const livDate = new Date(liv.created_at);
    if (livDate >= hierSoir) {
      aGarder.push(liv);
    } else {
      aPayer.push(liv);
    }
  });

  console.log(`\nLivraisons à garder (hier soir): ${aGarder.length}`);
  aGarder.forEach(liv => {
    console.log(`  - ${liv.id.slice(0,8)} | ${liv.created_at} | ${liv.frais_livraison}€`);
  });

  console.log(`\nLivraisons payées (retirer du compte): ${aPayer.length}`);
  aPayer.forEach(liv => {
    console.log(`  - ${liv.id.slice(0,8)} | ${liv.created_at} | ${liv.frais_livraison}€`);
  });

  // Retirer le livreur_id des anciennes livraisons (elles sont payées)
  if (aPayer.length > 0) {
    const ids = aPayer.map(l => l.id);
    const { error: updateError } = await supabase
      .from('commandes')
      .update({ livreur_id: null })
      .in('id', ids);

    if (updateError) {
      console.error('Erreur mise à jour:', updateError);
    } else {
      console.log(`\n✅ ${aPayer.length} livraisons retirées du compte de Théo (payées)`);
    }
  }

  // Calculer le total restant (non payé)
  const totalRestant = aGarder.reduce((sum, l) => sum + (parseFloat(l.frais_livraison) || 0), 0);
  console.log(`\n💰 Total restant à payer à Théo: ${totalRestant.toFixed(2)}€`);
}

resetTheoLivraisons();


/**
 * Script Node.js pour supprimer les commandes non payées de ce soir
 * 
 * Usage: node scripts/supprimer-commandes-non-payees-ce-soir.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function supprimerCommandesNonPayees() {
  try {
    console.log('🔍 Recherche des commandes non payées de ce soir...');
    
    // Date de début de la journée (00:00:00)
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    console.log('📅 Date de référence:', aujourdhui.toISOString());
    
    // 1. Compter les commandes à supprimer
    const { count, error: countError } = await supabase
      .from('commandes')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending')
      .gte('created_at', aujourdhui.toISOString());
    
    if (countError) {
      console.error('❌ Erreur lors du comptage:', countError);
      throw countError;
    }
    
    console.log(`📊 ${count || 0} commande(s) non payée(s) trouvée(s) aujourd'hui`);
    
    if (count === 0) {
      console.log('✅ Aucune commande non payée à supprimer');
      return;
    }
    
    // 2. Récupérer les IDs des commandes à supprimer
    const { data: commandes, error: fetchError } = await supabase
      .from('commandes')
      .select('id, created_at, total, frais_livraison, restaurant_id, adresse_livraison')
      .eq('payment_status', 'pending')
      .gte('created_at', aujourdhui.toISOString())
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('❌ Erreur lors de la récupération:', fetchError);
      throw fetchError;
    }
    
    console.log('\n📋 Détails des commandes à supprimer:');
    let montantTotal = 0;
    commandes.forEach((cmd, index) => {
      const montant = parseFloat(cmd.total || 0) + parseFloat(cmd.frais_livraison || 0);
      montantTotal += montant;
      console.log(`   ${index + 1}. ${cmd.id.slice(0, 8)}... - ${montant.toFixed(2)}€ - ${new Date(cmd.created_at).toLocaleTimeString('fr-FR')}`);
    });
    console.log(`\n💰 Montant total non payé: ${montantTotal.toFixed(2)}€`);
    
    // 3. Demander confirmation
    console.log('\n⚠️  ATTENTION: Cette opération est irréversible !');
    console.log('   Les commandes et leurs détails seront supprimés définitivement.');
    console.log('\n   Pour confirmer, modifiez le script et mettez CONFIRMER_SUPPRESSION = true');
    
    const CONFIRMER_SUPPRESSION = false; // Mettre à true pour confirmer
    
    if (!CONFIRMER_SUPPRESSION) {
      console.log('\n❌ Suppression annulée (CONFIRMER_SUPPRESSION = false)');
      console.log('   Pour supprimer, modifiez CONFIRMER_SUPPRESSION à true dans le script');
      return;
    }
    
    // 4. Supprimer les détails de commande d'abord (contrainte de clé étrangère)
    const commandeIds = commandes.map(c => c.id);
    console.log('\n🗑️  Suppression des détails de commande...');
    
    const { error: detailsError } = await supabase
      .from('details_commande')
      .delete()
      .in('commande_id', commandeIds);
    
    if (detailsError) {
      console.error('❌ Erreur lors de la suppression des détails:', detailsError);
      throw detailsError;
    }
    
    console.log('✅ Détails de commande supprimés');
    
    // 5. Supprimer les commandes
    console.log('🗑️  Suppression des commandes...');
    
    const { error: deleteError } = await supabase
      .from('commandes')
      .delete()
      .in('id', commandeIds);
    
    if (deleteError) {
      console.error('❌ Erreur lors de la suppression des commandes:', deleteError);
      throw deleteError;
    }
    
    console.log(`✅ ${commandes.length} commande(s) supprimée(s) avec succès`);
    console.log(`💰 Montant total supprimé: ${montantTotal.toFixed(2)}€`);
    
    // 6. Vérification
    const { count: countAfter, error: verifyError } = await supabase
      .from('commandes')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending')
      .gte('created_at', aujourdhui.toISOString());
    
    if (verifyError) {
      console.warn('⚠️  Erreur lors de la vérification:', verifyError);
    } else {
      console.log(`\n✅ Vérification: ${countAfter || 0} commande(s) non payée(s) restante(s) aujourd'hui`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
    process.exit(1);
  }
}

// Exécuter le script
supprimerCommandesNonPayees()
  .then(() => {
    console.log('\n✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });


/**
 * Script pour remettre le compte de Théo (livreur CVN'EAT) à 0
 * Usage: node scripts/reset-theo-account.mjs
 * 
 * Note: Vous devez être connecté en tant qu'admin et avoir un token d'authentification
 * Pour une utilisation directe, utilisez plutôt la console Supabase ou l'interface admin
 */

import { createClient } from '@supabase/supabase-js';

// Utiliser les variables d'environnement directement
// Vous pouvez aussi les définir ici si nécessaire
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trouvée dans les variables d\'environnement');
  console.error('   Veuillez ajouter SUPABASE_SERVICE_ROLE_KEY dans votre fichier .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetTheoAccount() {
  try {
    console.log('🔍 Recherche de Théo (livreur CVN\'EAT)...\n');
    
    // Rechercher Théo dans la table users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, nom, prenom, email, role')
      .or('nom.ilike.%théo%,prenom.ilike.%théo%,nom.ilike.%theo%,prenom.ilike.%theo%')
      .eq('role', 'delivery');
    
    if (usersError) {
      console.error('❌ Erreur lors de la recherche:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.error('❌ Aucun livreur nommé Théo trouvé');
      console.log('\n💡 Essayez de rechercher manuellement dans Supabase:');
      console.log('   SELECT * FROM users WHERE role = \'delivery\' AND (nom ILIKE \'%théo%\' OR prenom ILIKE \'%théo%\');');
      return;
    }
    
    console.log(`✅ ${users.length} livreur(s) trouvé(s):\n`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.prenom || ''} ${user.nom || ''} (${user.email})`);
      console.log(`      ID: ${user.id}\n`);
    });
    
    // Prendre le premier résultat
    const theo = users[0];
    console.log(`📝 Remise à zéro du compte de: ${theo.prenom || ''} ${theo.nom || ''} (${theo.email})\n`);
    
    // Vérifier les stats actuelles
    const { data: existingStats, error: statsError } = await supabaseAdmin
      .from('delivery_stats')
      .select('*')
      .eq('delivery_id', theo.id)
      .single();
    
    if (statsError && statsError.code !== 'PGRST116') {
      console.error('❌ Erreur lors de la vérification des stats:', statsError);
      return;
    }
    
    if (existingStats) {
      console.log(`📊 Stats actuelles:`);
      console.log(`   - Total gains: ${existingStats.total_earnings || 0}€`);
      console.log(`   - Total livraisons: ${existingStats.total_deliveries || 0}`);
      console.log(`   - Gains du mois dernier: ${existingStats.last_month_earnings || 0}€\n`);
      
      // Mettre à jour les stats pour remettre à 0
      const { error: updateError } = await supabaseAdmin
        .from('delivery_stats')
        .update({
          total_earnings: 0,
          last_month_earnings: 0,
          updated_at: new Date().toISOString()
        })
        .eq('delivery_id', theo.id);
      
      if (updateError) {
        console.error('❌ Erreur lors de la mise à jour:', updateError);
        return;
      }
      
      console.log('✅ Compte remis à 0 avec succès!\n');
    } else {
      // Créer une entrée avec des valeurs à 0
      const { error: insertError } = await supabaseAdmin
        .from('delivery_stats')
        .insert({
          delivery_id: theo.id,
          total_earnings: 0,
          last_month_earnings: 0,
          total_deliveries: 0,
          average_rating: 0,
          total_distance_km: 0,
          total_time_hours: 0
        });
      
      if (insertError) {
        console.error('❌ Erreur lors de la création:', insertError);
        return;
      }
      
      console.log('✅ Compte initialisé à 0 avec succès!\n');
    }
    
    // Vérifier le résultat final
    const { data: updatedStats } = await supabaseAdmin
      .from('delivery_stats')
      .select('*')
      .eq('delivery_id', theo.id)
      .single();
    
    console.log(`✅ Vérification finale:`);
    console.log(`   - Total gains: ${updatedStats?.total_earnings || 0}€`);
    console.log(`   - Total livraisons: ${updatedStats?.total_deliveries || 0}`);
    console.log(`   - Gains du mois dernier: ${updatedStats?.last_month_earnings || 0}€\n`);
    console.log('🎉 Le compte de Théo a été remis à 0 avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

resetTheoAccount();


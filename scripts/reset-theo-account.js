/**
 * Script pour remettre le compte de Théo (livreur CVN'EAT) à 0
 * Usage: node scripts/reset-theo-account.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trouvée dans les variables d\'environnement');
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
    console.log('🔍 Recherche de Théo (livreur)...');
    
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
      return;
    }
    
    console.log(`✅ ${users.length} livreur(s) trouvé(s):`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.prenom} ${user.nom} (${user.email}) - ID: ${user.id}`);
    });
    
    // Prendre le premier résultat (ou vous pouvez spécifier lequel)
    const theo = users[0];
    console.log(`\n📝 Remise à zéro du compte de: ${theo.prenom} ${theo.nom} (${theo.email})`);
    
    // Vérifier si des stats existent déjà
    const { data: existingStats, error: statsError } = await supabaseAdmin
      .from('delivery_stats')
      .select('*')
      .eq('delivery_id', theo.id)
      .single();
    
    if (statsError && statsError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Erreur lors de la vérification des stats:', statsError);
      return;
    }
    
    if (existingStats) {
      console.log(`📊 Stats actuelles:`);
      console.log(`   - Total gains: ${existingStats.total_earnings || 0}€`);
      console.log(`   - Total livraisons: ${existingStats.total_deliveries || 0}`);
      
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
      
      console.log('✅ Compte remis à 0 avec succès!');
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
      
      console.log('✅ Compte initialisé à 0 avec succès!');
    }
    
    // Vérifier le résultat
    const { data: updatedStats } = await supabaseAdmin
      .from('delivery_stats')
      .select('*')
      .eq('delivery_id', theo.id)
      .single();
    
    console.log(`\n✅ Vérification finale:`);
    console.log(`   - Total gains: ${updatedStats?.total_earnings || 0}€`);
    console.log(`   - Total livraisons: ${updatedStats?.total_deliveries || 0}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

resetTheoAccount();


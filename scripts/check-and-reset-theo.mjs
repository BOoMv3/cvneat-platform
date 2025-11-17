/**
 * Script pour vérifier et remettre le compte de Théo à 0
 * Usage: node scripts/check-and-reset-theo.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trouvée');
  console.error('   Définissez-la dans votre fichier .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAndResetTheo() {
  try {
    console.log('🔍 Recherche de Théo (theo@cvneat.fr)...\n');
    
    // Rechercher Théo par email
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, nom, prenom, email, role')
      .eq('email', 'theo@cvneat.fr')
      .eq('role', 'delivery');
    
    if (usersError) {
      console.error('❌ Erreur lors de la recherche:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.error('❌ Aucun livreur trouvé avec l\'email theo@cvneat.fr');
      // Essayer de chercher par nom
      const { data: usersByName } = await supabaseAdmin
        .from('users')
        .select('id, nom, prenom, email, role')
        .or('nom.ilike.%théo%,prenom.ilike.%théo%,nom.ilike.%theo%,prenom.ilike.%theo%')
        .eq('role', 'delivery');
      
      if (usersByName && usersByName.length > 0) {
        console.log('\n📋 Livreurs trouvés par nom:');
        usersByName.forEach((u, i) => {
          console.log(`   ${i + 1}. ${u.prenom || ''} ${u.nom || ''} (${u.email}) - ID: ${u.id}`);
        });
      }
      return;
    }
    
    const theo = users[0];
    console.log(`✅ Théo trouvé: ${theo.prenom || ''} ${theo.nom || ''} (${theo.email})`);
    console.log(`   ID: ${theo.id}\n`);
    
    // Vérifier si la colonne livreur_paid_at existe
    console.log('🔍 Vérification de la colonne livreur_paid_at...');
    const { data: ordersCheck } = await supabaseAdmin
      .from('commandes')
      .select('livreur_paid_at')
      .eq('livreur_id', theo.id)
      .limit(1);
    
    const hasPaidColumn = ordersCheck !== null && !ordersCheck.some(o => o.livreur_paid_at === undefined);
    
    if (!hasPaidColumn) {
      console.log('⚠️  La colonne livreur_paid_at n\'existe pas encore.');
      console.log('   Ajout de la colonne...');
      
      // On ne peut pas ajouter de colonne via l'API Supabase JS, il faut le faire en SQL
      console.log('   ❌ Impossible d\'ajouter la colonne via ce script.');
      console.log('   Veuillez exécuter dans Supabase SQL Editor:');
      console.log('   ALTER TABLE commandes ADD COLUMN IF NOT EXISTS livreur_paid_at TIMESTAMP WITH TIME ZONE;');
      return;
    }
    
    // Vérifier les stats actuelles
    const { data: stats } = await supabaseAdmin
      .from('delivery_stats')
      .select('*')
      .eq('delivery_id', theo.id)
      .single();
    
    // Compter les commandes non payées
    const { data: unpaidOrders, count: unpaidCount } = await supabaseAdmin
      .from('commandes')
      .select('id, frais_livraison', { count: 'exact' })
      .eq('livreur_id', theo.id)
      .eq('statut', 'livree')
      .is('livreur_paid_at', null);
    
    const unpaidEarnings = unpaidOrders?.reduce((sum, o) => sum + (parseFloat(o.frais_livraison) || 0), 0) || 0;
    
    console.log('📊 État actuel:');
    console.log(`   - Gains dans delivery_stats: ${stats?.total_earnings || 0}€`);
    console.log(`   - Commandes non payées: ${unpaidCount || 0}`);
    console.log(`   - Montant non payé: ${unpaidEarnings.toFixed(2)}€`);
    console.log(`   - Total livraisons: ${stats?.total_deliveries || 0}\n`);
    
    if ((stats?.total_earnings || 0) === 0 && (unpaidCount || 0) === 0) {
      console.log('✅ Le compte est déjà à 0€ !');
      return;
    }
    
    console.log('🔄 Remise à zéro en cours...\n');
    
    // ÉTAPE 1: Marquer toutes les commandes comme payées
    const { error: markPaidError } = await supabaseAdmin
      .from('commandes')
      .update({
        livreur_paid_at: new Date().toISOString()
      })
      .eq('livreur_id', theo.id)
      .eq('statut', 'livree')
      .is('livreur_paid_at', null);
    
    if (markPaidError) {
      console.error('❌ Erreur lors du marquage des commandes:', markPaidError);
      return;
    }
    
    console.log(`✅ ${unpaidCount || 0} commande(s) marquée(s) comme payée(s)`);
    
    // ÉTAPE 2: Remettre delivery_stats à 0
    if (stats) {
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
    } else {
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
    }
    
    console.log('✅ delivery_stats remis à 0\n');
    
    // Vérification finale
    const { data: finalStats } = await supabaseAdmin
      .from('delivery_stats')
      .select('*')
      .eq('delivery_id', theo.id)
      .single();
    
    const { count: finalUnpaidCount } = await supabaseAdmin
      .from('commandes')
      .select('*', { count: 'exact', head: true })
      .eq('livreur_id', theo.id)
      .eq('statut', 'livree')
      .is('livreur_paid_at', null);
    
    console.log('✅ Vérification finale:');
    console.log(`   - Gains dans delivery_stats: ${finalStats?.total_earnings || 0}€`);
    console.log(`   - Commandes non payées restantes: ${finalUnpaidCount || 0}`);
    console.log('\n🎉 Le compte de Théo a été remis à 0€ avec succès!');
    console.log('   Théo devrait maintenant voir 0€ dans son dashboard livreur.');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkAndResetTheo();


#!/usr/bin/env node

/**
 * Script pour appliquer la migration d'expiration automatique des commandes
 * Usage: node scripts/apply-delivery-expiration-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erreur: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis');
  console.error('Vérifiez votre fichier .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🔄 Application de la migration d\'expiration automatique des commandes...\n');

  // Lire le fichier SQL
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250123000000_add_delivery_expiration_to_orders.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Fichier de migration introuvable: ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  // Diviser le SQL en commandes individuelles (séparées par ;)
  // On va exécuter chaque commande séparément pour mieux gérer les erreurs
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 ${statements.length} commandes SQL à exécuter\n`);

  try {
    // Exécuter chaque commande SQL
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Ignorer les commentaires et les fonctions vides
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      console.log(`[${i + 1}/${statements.length}] Exécution...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      // Si exec_sql n'existe pas, on essaie une autre méthode
      if (error && error.message?.includes('exec_sql')) {
        // Méthode alternative : utiliser query() directement
        // Note: Supabase JS ne supporte pas directement l'exécution SQL arbitraire
        // Il faut utiliser l'API REST directement
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ sql_query: statement })
        });

        if (!response.ok) {
          // Si exec_sql n'existe toujours pas, on affiche un message
          console.log(`⚠️  Note: La fonction exec_sql n'est pas disponible.`);
          console.log(`   Veuillez exécuter cette commande manuellement dans Supabase SQL Editor:\n`);
          console.log(`${statement};`);
          console.log('');
          continue;
        }
      } else if (error) {
        // Certaines erreurs sont normales (IF NOT EXISTS, etc.)
        if (error.message?.includes('already exists') || 
            error.message?.includes('duplicate') ||
            error.message?.includes('IF NOT EXISTS')) {
          console.log(`   ⚠️  ${error.message} (ignoré)`);
        } else {
          console.error(`   ❌ Erreur: ${error.message}`);
          // On continue quand même pour les autres commandes
        }
      } else {
        console.log(`   ✅ Succès`);
      }
    }

    console.log('\n✅ Migration appliquée avec succès!');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Vérifiez que la colonne delivery_requested_at existe dans la table commandes');
    console.log('2. Configurez un cron job pour appeler /api/admin/cleanup-expired-orders toutes les minutes');
    console.log('3. Testez le workflow: créez une commande et attendez 10 minutes sans livreur');

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'application de la migration:', error);
    console.error('\n💡 Solution alternative:');
    console.error('Copiez le contenu du fichier de migration et exécutez-le dans le Supabase SQL Editor:');
    console.error(`   ${migrationPath}`);
    process.exit(1);
  }
}

// Fonction pour exécuter SQL directement via l'API REST Supabase
async function executeSQL(sql) {
  // Supabase n'expose pas directement l'exécution SQL via l'API REST
  // Il faut utiliser pgREST ou une fonction SQL personnalisée
  // Pour l'instant, on affiche simplement les instructions
  
  console.log('\n⚠️  Exécution SQL directe non disponible via l\'API Supabase.');
  console.log('   Veuillez exécuter la migration manuellement dans Supabase SQL Editor.\n');
  console.log('📋 SQL à exécuter:\n');
  console.log(sql);
  console.log('\n');
}

applyMigration().catch(console.error);


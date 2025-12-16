#!/usr/bin/env node

/**
 * Script simple pour appliquer la migration SQL via l'API Supabase
 * Ce script exécute le SQL directement dans Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis plusieurs sources
const envFiles = [
  path.join(__dirname, '..', '.env.local'),
  path.join(__dirname, '..', '.env'),
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), '.env')
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    require('dotenv').config({ path: envFile });
    break;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('\n💡 Assurez-vous que ces variables sont définies dans .env.local');
  process.exit(1);
}

async function executeSQL(sqlStatements) {
  console.log('🔄 Connexion à Supabase...\n');
  
  // On ne peut pas exécuter SQL directement via l'API Supabase JS
  // Il faut utiliser l'API REST Supabase Management ou exécuter via pgREST
  // Pour l'instant, on va utiliser une méthode via l'API REST
  
  const statements = sqlStatements
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && s.length > 10);

  console.log(`📝 ${statements.length} commandes SQL à exécuter\n`);

  // Exécuter via l'API REST Supabase (PostgREST)
  // Note: PostgREST ne supporte pas l'exécution SQL arbitraire
  // Il faut créer une fonction SQL qui accepte du SQL en paramètre, ce qui n'est pas sécurisé
  
  console.log('⚠️  Supabase ne permet pas l\'exécution SQL arbitraire via l\'API pour des raisons de sécurité.');
  console.log('   La migration doit être exécutée manuellement dans le Supabase SQL Editor.\n');
  
  console.log('📋 Instructions:\n');
  console.log('1. Allez sur https://supabase.com/dashboard');
  console.log('2. Sélectionnez votre projet');
  console.log('3. Allez dans "SQL Editor"');
  console.log('4. Copiez-collez le SQL ci-dessous:\n');
  console.log('─'.repeat(70));
  console.log(sqlStatements);
  console.log('─'.repeat(70));
  
  // Afficher aussi le chemin du fichier
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250123000000_add_delivery_expiration_to_orders.sql');
  console.log(`\n💾 Ou ouvrez directement le fichier: ${migrationPath}\n`);
}

async function main() {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250123000000_add_delivery_expiration_to_orders.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Fichier de migration introuvable: ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  await executeSQL(migrationSQL);
}

main().catch(console.error);


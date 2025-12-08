import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Load environment variables from .env.local if not already set
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  try {
    const envFile = readFileSync(envPath, 'utf8');
    envFile.split(/\r?\n/).forEach((lineRaw) => {
      const line = lineRaw.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (!key || valueParts.length === 0) return;
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (!SUPABASE_URL && (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_URL')) SUPABASE_URL = value;
      if (!SUPABASE_SERVICE_KEY && key === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_KEY = value;
    });
  } catch (error) {
    console.error('Impossible de lire .env.local:', error.message);
    process.exit(1);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Erreur: Les variables d\'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ne sont pas définies.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function resetTheoEarnings() {
  console.log('🔄 Réinitialisation des gains de Theo...\n');

  try {
    // 1. Trouver l'utilisateur theo@cvneat.fr dans la table users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, nom, prenom, role')
      .eq('email', 'theo@cvneat.fr')
      .eq('role', 'delivery');
    
    if (usersError) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.error('❌ Utilisateur theo@cvneat.fr non trouvé dans la table users');
      // Essayer de trouver par nom
      const { data: usersByName } = await supabaseAdmin
        .from('users')
        .select('id, email, nom, prenom, role')
        .eq('role', 'delivery')
        .or('nom.ilike.%theo%,prenom.ilike.%theo%');
      
      if (usersByName && usersByName.length > 0) {
        console.log('📋 Livreurs trouvés avec "theo" dans le nom:');
        usersByName.forEach(u => {
          console.log(`   - ${u.prenom} ${u.nom} (${u.email}) - ID: ${u.id}`);
        });
      }
      return;
    }

    const theo = users[0];
    console.log(`✅ Utilisateur trouvé: ${theo.email} (ID: ${theo.id})\n`);

    // 2. Vérifier les stats actuelles
    const { data: currentStats, error: statsError } = await supabaseAdmin
      .from('delivery_stats')
      .select('*')
      .eq('delivery_id', theo.id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('❌ Erreur lors de la récupération des stats:', statsError);
      return;
    }

    if (currentStats) {
      console.log('📊 Stats actuelles:');
      console.log(`   - Total livraisons: ${currentStats.total_deliveries || 0}`);
      console.log(`   - Total gains: ${parseFloat(currentStats.total_earnings || 0).toFixed(2)}€\n`);
    } else {
      console.log('📊 Aucune stat trouvée (sera créée)\n');
    }

    // 3. Marquer toutes les commandes livrées comme payées
    const { data: ordersToMark, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, frais_livraison, livreur_paid_at')
      .eq('livreur_id', theo.id)
      .eq('statut', 'livree')
      .is('livreur_paid_at', null);

    if (ordersError) {
      console.warn('⚠️ Erreur lors de la récupération des commandes:', ordersError);
    } else {
      const ordersCount = ordersToMark?.length || 0;
      if (ordersCount > 0) {
        console.log(`📦 ${ordersCount} commande(s) à marquer comme payée(s)\n`);
        
        const { error: markPaidError } = await supabaseAdmin
          .from('commandes')
          .update({
            livreur_paid_at: new Date().toISOString()
          })
          .eq('livreur_id', theo.id)
          .eq('statut', 'livree')
          .is('livreur_paid_at', null);

        if (markPaidError) {
          console.warn('⚠️ Erreur lors du marquage des commandes comme payées:', markPaidError);
          // Continuer quand même si la colonne n'existe pas encore
        } else {
          console.log(`✅ ${ordersCount} commande(s) marquée(s) comme payée(s)\n`);
        }
      } else {
        console.log('ℹ️ Aucune commande à marquer comme payée\n');
      }
    }

    // 4. Réinitialiser les gains à 0 dans delivery_stats
    let updatedStats;
    
    if (currentStats) {
      // Mettre à jour les stats existantes
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('delivery_stats')
        .update({
          total_earnings: 0.00,
          updated_at: new Date().toISOString()
        })
        .eq('delivery_id', theo.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erreur lors de la mise à jour:', updateError);
        return;
      }
      updatedStats = updated;
    } else {
      // Créer les stats si elles n'existent pas
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('delivery_stats')
        .insert({
          delivery_id: theo.id,
          total_earnings: 0.00,
          total_deliveries: currentStats?.total_deliveries || 0,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erreur lors de la création:', insertError);
        return;
      }
      updatedStats = inserted;
    }

    console.log('✅ Gains réinitialisés avec succès !\n');
    console.log('📊 Nouvelles stats:');
    console.log(`   - Total livraisons: ${updatedStats.total_deliveries || 0}`);
    console.log(`   - Total gains: ${parseFloat(updatedStats.total_earnings || 0).toFixed(2)}€\n`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

resetTheoEarnings()
  .then(() => {
    console.log('✅ Opération terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });


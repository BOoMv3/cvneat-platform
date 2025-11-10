import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      if (!key) return;
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    // File peut ne pas exister, ignorer
  }
}

loadEnvFile(resolve(process.cwd(), '.env'));
loadEnvFile(resolve(process.cwd(), '.env.local'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Variables d’environnement Supabase manquantes.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const orderId = process.argv[2];

if (!orderId) {
  console.error('❌ Merci de fournir l’ID de la commande. Exemple : node scripts/delete-order.mjs <commande_id>');
  process.exit(1);
}

async function main() {
  console.log(`🧹 Suppression de la commande ${orderId}...`);

  const { error: detailsError } = await supabase
    .from('details_commande')
    .delete()
    .eq('commande_id', orderId);

  if (detailsError) {
    console.error('❌ Erreur suppression details_commande:', detailsError);
    process.exit(1);
  }

  const { error: orderError } = await supabase
    .from('commandes')
    .delete()
    .eq('id', orderId);

  if (orderError) {
    console.error('❌ Erreur suppression commande:', orderError);
    process.exit(1);
  }

  console.log('✅ Commande et détails supprimés.');
}

main().then(() => process.exit(0));


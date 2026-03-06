#!/usr/bin/env node
/**
 * Ouvre Deliss'King uniquement : ferme_manuellement = false.
 * Affiche aussi l'état actuel et les horaires du jour pour debug.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: r, error: e } = await supabase
    .from('restaurants')
    .select('id, nom, ferme_manuellement, horaires')
    .or('nom.ilike.%deliss%')
    .limit(1)
    .single();

  if (e || !r) {
    console.error('❌ Restaurant non trouvé:', e?.message || e);
    process.exit(1);
  }

  console.log('📋 Deliss King actuel:');
  console.log('   id:', r.id);
  console.log('   nom:', r.nom);
  console.log('   ferme_manuellement:', r.ferme_manuellement, '(type:', typeof r.ferme_manuellement + ')');
  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const today = dayNames[new Date().getDay()];
  const todayFr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' }).toLowerCase();
  console.log('   horaires (clés):', r.horaires ? Object.keys(r.horaires) : 'null');
  console.log('   jour serveur (getDay):', new Date().getDay(), '→', today);
  console.log('   jour Paris:', todayFr);
  if (r.horaires && r.horaires[todayFr]) {
    console.log('   horaires du jour (' + todayFr + '):', JSON.stringify(r.horaires[todayFr], null, 2));
  } else if (r.horaires) {
    console.log('   horaires lundi (exemple):', JSON.stringify(r.horaires.lundi, null, 2));
  }

  const { error: u } = await supabase
    .from('restaurants')
    .update({ ferme_manuellement: false, updated_at: new Date().toISOString() })
    .eq('id', r.id);

  if (u) {
    console.error('❌ Erreur update:', u.message);
    process.exit(1);
  }
  console.log('\n✅ Deliss King mis en ouvert (ferme_manuellement = false).');
}

main();

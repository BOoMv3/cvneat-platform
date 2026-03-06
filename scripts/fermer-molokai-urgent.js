#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: r, error: e } = await supabase
    .from('restaurants')
    .select('id, nom, ferme_manuellement')
    .ilike('nom', '%Molokai%')
    .limit(1)
    .single();

  if (e || !r) {
    console.error('❌ Molokai non trouvé:', e?.message || e);
    process.exit(1);
  }

  const { error: u } = await supabase
    .from('restaurants')
    .update({ ferme_manuellement: true, updated_at: new Date().toISOString() })
    .eq('id', r.id);

  if (u) {
    console.error('❌ Erreur:', u.message);
    process.exit(1);
  }
  console.log('🔒 Molokai fermé (ferme_manuellement = true).');
}

main();

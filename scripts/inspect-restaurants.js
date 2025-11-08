const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4Ymdydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjQyNDMsImV4cCI6MjA3MTk0MDI0M30.FqDYhevVvPYe-1t52OcidgP6jG-ynJVOFkyGTPHk84A';

async function run() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('restaurants').select('*');
  if (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }

  const normalizeName = (value = '') =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const filtered = (data || []).filter((restaurant) => {
    if (restaurant.is_active === false || restaurant.active === false || restaurant.status === 'inactive') {
      return false;
    }
    if (restaurant.ferme_definitivement) {
      return false;
    }
    return true;
  });

  const seen = new Set();
  const display = filtered.filter((restaurant) => {
    const key = normalizeName(restaurant.nom) || restaurant.id;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  console.log('Tous:', data.length);
  console.log('Après filtre actif:', filtered.length);
  console.log('Affichés:', display.length);
  console.log(display.map(r => ({ nom: r.nom, status: r.status, ferme: r.ferme_manuellement })));
}

run();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function debugRestaurants() {
  console.log('🔍 Débogage des restaurants "Saona" et "La Bonne Pâte"...');
  
  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom, ferme_manuellement, status, horaires')
    .or('nom.ilike.%saona%,nom.ilike.%bonne pate%,nom.ilike.%bonne pâte%');

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ Aucun restaurant trouvé.');
    return;
  }

  const now = new Date();
  const frTime = now.toLocaleString('fr-FR', { 
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  console.log(`🕐 Heure actuelle (Paris): ${frTime}\n`);

  data.forEach(resto => {
    console.log(`--- ${resto.nom} ---`);
    console.log('ID:', resto.id);
    console.log('Fermé manuellement:', resto.ferme_manuellement);
    
    let horaires = resto.horaires;
    if (typeof horaires === 'string') {
      try { horaires = JSON.parse(horaires); } catch (e) {}
    }
    
    const todayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' });
    const todayName = todayFormatter.format(now).toLowerCase();
    console.log('Jour actuel:', todayName);
    
    const dayData = horaires?.[todayName] || horaires?.[todayName.charAt(0).toUpperCase() + todayName.slice(1)] || horaires?.[todayName.toUpperCase()];
    
    if (dayData) {
      console.log('Horaires aujourd\'hui:', JSON.stringify(dayData, null, 2));
    } else {
      console.log('❌ PAS D\'HORAIRES POUR AUJOURD\'HUI');
    }
    
    const status = checkOpen(resto);
    console.log('STATUT FINAL CALCULÉ:', status.isOpen ? '✅ OUVERT' : '❌ FERMÉ', `(Raison: ${status.reason})`);
    console.log('------------------------\n');
  });
}

function checkOpen(restaurant) {
  let fermeManuel = restaurant.ferme_manuellement;
  if (typeof fermeManuel === 'string') {
    fermeManuel = fermeManuel.toLowerCase() === 'true' || fermeManuel === '1';
  }

  const isManuallyClosed = fermeManuel === true || 
                           fermeManuel === 'true' || 
                           fermeManuel === '1' || 
                           fermeManuel === 1;

  if (isManuallyClosed) {
    return { isOpen: false, reason: 'manual' };
  }

  let horaires = restaurant.horaires;
  if (!horaires) return { isOpen: false, reason: 'no_hours' };

  if (typeof horaires === 'string') {
    try { horaires = JSON.parse(horaires); } catch { return { isOpen: false, reason: 'parse_error' }; }
  }

  const todayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' });
  const todayName = todayFormatter.format(new Date()).toLowerCase();
  const variants = [todayName, todayName.charAt(0).toUpperCase() + todayName.slice(1), todayName.toUpperCase()];
  
  let dayData = null;
  for (const key of variants) {
    if (horaires?.[key]) {
      dayData = horaires[key];
      break;
    }
  }

  if (!dayData) return { isOpen: false, reason: 'closed_today' };

  const hasPlages = Array.isArray(dayData.plages) && dayData.plages.length > 0;
  const hasExplicitHours = hasPlages || (dayData.ouverture && dayData.fermeture);

  if (!hasExplicitHours && dayData.ouvert === false) {
    return { isOpen: false, reason: 'closed_today_flag' };
  }

  const now = new Date();
  const frTime = now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false });
  const [h, m] = frTime.split(':').map(Number);
  const currentTime = h * 60 + m;

  const parseT = (t) => {
    if (!t) return null;
    const [hh, mm] = t.split(':').map(Number);
    let tot = hh * 60 + mm;
    if (tot === 0 && hh === 0 && mm === 0) tot = 1440;
    return tot;
  };

  if (hasPlages) {
    for (const p of dayData.plages) {
      const start = parseT(p.ouverture);
      const end = parseT(p.fermeture);
      if (currentTime >= start && currentTime <= end) return { isOpen: true, reason: 'open_plage' };
    }
    return { isOpen: false, reason: 'outside_plages' };
  }

  if (dayData.ouverture && dayData.fermeture) {
    const start = parseT(dayData.ouverture);
    const end = parseT(dayData.fermeture);
    if (currentTime >= start && currentTime <= end) return { isOpen: true, reason: 'open_simple' };
    return { isOpen: false, reason: 'outside_hours' };
  }

  if (dayData.ouvert === true) return { isOpen: true, reason: 'open_flag' };

  return { isOpen: false, reason: 'unknown' };
}

debugRestaurants();


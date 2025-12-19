import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erreur: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkRestaurant() {
  console.log('🔍 Vérification du statut de "Le O Saona Tea"...');
  
  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom, ferme_manuellement, status, horaires')
    .ilike('nom', '%saona%');

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ Aucun restaurant trouvé avec "saona" dans le nom.');
    return;
  }

  data.forEach(resto => {
    console.log('\n--- RESTAURANT ---');
    console.log('Nom:', resto.nom);
    console.log('ID:', resto.id);
    console.log('Fermé manuellement:', resto.ferme_manuellement);
    console.log('Type ferme_manuellement:', typeof resto.ferme_manuellement);
    console.log('Status:', resto.status);
    console.log('Horaires:', JSON.stringify(resto.horaires, null, 2));
    
    // Simuler la logique de checkRestaurantOpenStatus
    const isOpenStatus = simulateCheckOpen(resto);
    console.log('Statut calculé:', isOpenStatus);
  });
}

function simulateCheckOpen(restaurant) {
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
    try {
      horaires = JSON.parse(horaires);
    } catch {
      return { isOpen: false, reason: 'parse_error' };
    }
  }

  const todayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' });
  const todayName = todayFormatter.format(new Date()).toLowerCase();
  
  const variants = [todayName, todayName.charAt(0).toUpperCase() + todayName.slice(1), todayName.toUpperCase()];
  
  let heuresJour = null;
  for (const key of variants) {
    if (horaires?.[key]) {
      heuresJour = horaires[key];
      break;
    }
  }

  if (!heuresJour) return { isOpen: false, reason: 'closed_today' };

  const hasExplicitHours = (Array.isArray(heuresJour.plages) && heuresJour.plages.length > 0) || 
                           (heuresJour.ouverture && heuresJour.fermeture);

  if (!hasExplicitHours && heuresJour.ouvert === false) {
    return { isOpen: false, reason: 'closed_today_flag' };
  }

  // Vérification de l'heure
  const now = new Date();
  const frTime = now.toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const [currentHours, currentMinutes] = frTime.split(':').map(Number);
  const currentTime = currentHours * 60 + currentMinutes;

  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;
    if (totalMinutes === 0 && hours === 0 && minutes === 0) {
      totalMinutes = 24 * 60;
    }
    return totalMinutes;
  };

  if (Array.isArray(heuresJour.plages) && heuresJour.plages.length > 0) {
    for (const plage of heuresJour.plages) {
      if (plage?.ouverture && plage?.fermeture) {
        const openTime = parseTime(plage.ouverture);
        let closeTime = parseTime(plage.fermeture);
        if (openTime === null || closeTime === null) continue;
        
        const isMidnightClose = plage.fermeture === '00:00' || plage.fermeture === '0:00';
        if (isMidnightClose) closeTime = 24 * 60;

        if (currentTime >= openTime && currentTime <= closeTime) {
          return { isOpen: true, reason: 'open_plage', time: frTime, plage: `${plage.ouverture}-${plage.fermeture}` };
        }
      }
    }
    return { isOpen: false, reason: 'outside_plages', time: frTime };
  }

  if (heuresJour.ouverture && heuresJour.fermeture) {
    const openTime = parseTime(heuresJour.ouverture);
    let closeTime = parseTime(heuresJour.fermeture);
    if (openTime === null || closeTime === null) return { isOpen: false, reason: 'invalid_hours' };

    const isMidnightClose = heuresJour.fermeture === '00:00' || heuresJour.fermeture === '0:00';
    if (isMidnightClose) closeTime = 24 * 60;

    if (currentTime >= openTime && currentTime <= closeTime) {
      return { isOpen: true, reason: 'open_simple', time: frTime, hours: `${heuresJour.ouverture}-${heuresJour.fermeture}` };
    }
    return { isOpen: false, reason: 'outside_hours', time: frTime };
  }

  if (heuresJour.ouvert === true) {
    return { isOpen: true, reason: 'open_flag' };
  }

  return { isOpen: false, reason: 'unknown' };
}

checkRestaurant();


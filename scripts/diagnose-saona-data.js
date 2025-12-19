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

async function diagnoseSaona() {
  console.log('🔍 Diagnostic approfondi pour "Le O Saona Tea"...');
  
  const { data: restos, error } = await supabaseAdmin
    .from('restaurants')
    .select('*')
    .ilike('nom', '%saona%');

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (!restos || restos.length === 0) {
    console.log('⚠️ Aucun restaurant Saona trouvé.');
    return;
  }

  const now = new Date();
  const options = { timeZone: 'Europe/Paris', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false };
  const formatter = new Intl.DateTimeFormat('fr-FR', options);
  const parts = formatter.formatToParts(now);
  const todayName = parts.find(p => p.type === 'weekday').value.toLowerCase();
  const frTime = `${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}`;

  console.log(`🕐 Heure actuelle (Paris): ${frTime} (${todayName})\n`);

  for (const resto of restos) {
    console.log(`--- ${resto.nom} ---`);
    console.log('ID:', resto.id);
    console.log('Fermé manuellement:', resto.ferme_manuellement);
    console.log('Status:', resto.status);
    
    let horaires = resto.horaires;
    if (typeof horaires === 'string') {
      try { horaires = JSON.parse(horaires); } catch (e) { console.log('❌ Erreur de parsing JSON'); }
    }
    
    console.log('Horaires complets:', JSON.stringify(horaires, null, 2));
    
    const dayData = horaires?.[todayName] || 
                    horaires?.[todayName.charAt(0).toUpperCase() + todayName.slice(1)] || 
                    horaires?.[todayName.toUpperCase()];
    
    if (dayData) {
      console.log(`\nHoraires pour ${todayName}:`, JSON.stringify(dayData, null, 2));
      const hasPlages = Array.isArray(dayData.plages) && dayData.plages.length > 0;
      const hasSimple = dayData.ouverture && dayData.fermeture;
      console.log('A des plages:', hasPlages);
      console.log('A des horaires simples:', !!hasSimple);
      console.log('Flag ouvert:', dayData.ouvert);
    } else {
      console.log(`\n❌ AUCUNE DONNÉE POUR ${todayName}`);
      console.log('Clés disponibles:', Object.keys(horaires || {}));
    }
  }
}

diagnoseSaona();


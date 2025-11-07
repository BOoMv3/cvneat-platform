import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  try {
    const envFile = readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach((lineRaw) => {
      const line = lineRaw.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (!key || valueParts.length === 0) return;
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !SUPABASE_URL) SUPABASE_URL = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !SUPABASE_SERVICE_KEY) SUPABASE_SERVICE_KEY = value;
    });
  } catch (error) {
    console.error('Impossible de lire .env.local :', error.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Variables Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const OLD_USER_ID = 'b85409a1-5555-4fed-a08e-82003045d28c';
const AUTH_USER_ID = '2113ebcf-dc04-410b-9f8a-31a7280154cb';
const RESTAURANT_ID = '7a143449-1834-4627-b3bd-d1be1f0d38d2';

async function main() {
  const { data: existingUser, error: fetchUserError } = await supabase
    .from('users')
    .select('*')
    .eq('id', OLD_USER_ID)
    .single();

  if (fetchUserError) {
    console.error('Erreur récupération ancien utilisateur :', fetchUserError.message);
    process.exit(1);
  }

  console.log('Ancien utilisateur trouvé :', existingUser.email);

  if (existingUser.email !== 'lassiettedessaisons1@cvneat.fr') {
    console.warn('Email inattendu pour l\'ancien utilisateur. Abandon.');
    process.exit(1);
  }

  const legacyEmail = 'lassiettedessaisons1+legacy@cvneat.fr';

  console.log('➡️  Mise à jour de l\'ancien utilisateur avec un email legacy…');
  const { error: updateEmailError } = await supabase
    .from('users')
    .update({ email: legacyEmail })
    .eq('id', OLD_USER_ID);

  if (updateEmailError) {
    console.error('Erreur lors de la mise à jour de l\'email legacy :', updateEmailError.message);
    process.exit(1);
  }

  console.log('➡️  Insertion du nouvel utilisateur avec l\'ID Supabase Auth…');
  const newUserPayload = {
    id: AUTH_USER_ID,
    email: 'lassiettedessaisons1@cvneat.fr',
    nom: existingUser.nom,
    prenom: existingUser.prenom,
    telephone: existingUser.telephone,
    adresse: existingUser.adresse,
    code_postal: existingUser.code_postal,
    ville: existingUser.ville,
    role: existingUser.role,
    points_fidelite: existingUser.points_fidelite,
    historique_points: existingUser.historique_points,
    password: existingUser.password,
  };

  const { error: insertUserError } = await supabase
    .from('users')
    .insert([newUserPayload]);

  if (insertUserError) {
    console.error('Erreur insertion nouvel utilisateur :', insertUserError.message);
    console.log('Restauration de l\'email d\'origine…');
    await supabase.from('users').update({ email: existingUser.email }).eq('id', OLD_USER_ID);
    process.exit(1);
  }

  console.log('➡️  Mise à jour du restaurant pour pointer vers le nouvel utilisateur…');
  const { error: updateRestaurantError } = await supabase
    .from('restaurants')
    .update({ user_id: AUTH_USER_ID })
    .eq('id', RESTAURANT_ID);

  if (updateRestaurantError) {
    console.error('Erreur mise à jour restaurant :', updateRestaurantError.message);
    console.log('Restauration des changements…');
    await supabase.from('restaurants').update({ user_id: OLD_USER_ID }).eq('id', RESTAURANT_ID);
    await supabase.from('users').delete().eq('id', AUTH_USER_ID);
    await supabase.from('users').update({ email: existingUser.email }).eq('id', OLD_USER_ID);
    process.exit(1);
  }

  console.log('✅ Migration effectuée');
  console.log('➡️  Pensez à vérifier les commandes ou autres tables si nécessaire.');
}

main();


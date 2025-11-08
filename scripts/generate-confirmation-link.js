#!/usr/bin/env node

/**
 * Génère un lien de confirmation Supabase pour un utilisateur donné.
 *
 * Usage :
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/generate-confirmation-link.js email@example.com
 *
 * Optionnel :
 *   SUPABASE_URL peut être défini, sinon l'URL de production est utilisée.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.argv[2];
const REDIRECT_TO = process.env.SUPABASE_EMAIL_REDIRECT_TO ?? process.env.SUPABASE_REDIRECT_TO ?? 'https://www.cvneat.fr/auth/confirm';
const PASSWORD = process.argv[3] ?? process.env.SUPABASE_DEFAULT_PASSWORD ?? undefined;

if (!SERVICE_ROLE_KEY) {
  console.error('Erreur : SUPABASE_SERVICE_ROLE_KEY est requis.');
  process.exit(1);
}

if (!EMAIL) {
  console.error('Erreur : veuillez fournir un email en argument.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const payload = {
    type: 'signup',
    email: EMAIL,
    options: {
      redirectTo: REDIRECT_TO,
    },
  };

  if (PASSWORD) {
    payload.password = PASSWORD;
  }

  const { data, error } = await supabase.auth.admin.generateLink(payload);

  if (error) {
    console.error('Erreur Supabase :', error.message);
    process.exit(1);
  }

  const link = data?.properties?.action_link;
  if (!link) {
    console.warn('Lien non retourné, réponse brute :', data);
    process.exit(1);
  }

  console.log('Lien de confirmation généré :');
  console.log(link);
}

main().catch((err) => {
  console.error('Erreur inattendue :', err);
  process.exit(1);
});


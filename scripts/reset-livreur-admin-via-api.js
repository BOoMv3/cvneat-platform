#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const email = 'livreuradmin@cvneat.fr';
const newPassword = 'livreuradmin0.';

// Valeurs par défaut
const DEFAULT_SUPABASE_URL = 'https://jxbqrvlmvnofaxbtcmsw.supabase.co';
const API_BASE_URL = 'https://cvneat.fr';

const envPath = join(process.cwd(), '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
let SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@cvneat.fr';
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Essayer de lire depuis .env.local
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((lineRaw) => {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    if (!key || valueParts.length === 0) return;
    const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !process.env.NEXT_PUBLIC_SUPABASE_URL) SUPABASE_URL = value;
    if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !SUPABASE_ANON_KEY) SUPABASE_ANON_KEY = value;
    if (key === 'ADMIN_EMAIL' && !process.env.ADMIN_EMAIL) ADMIN_EMAIL = value;
    if (key === 'ADMIN_PASSWORD' && !ADMIN_PASSWORD) ADMIN_PASSWORD = value;
  });
}

if (!SUPABASE_ANON_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY manquante.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log(`🔐 Réinitialisation du mot de passe pour ${email} via API admin...`);
  console.log('');

  // Se connecter en tant qu'admin
  if (!ADMIN_PASSWORD) {
    console.error('❌ ADMIN_PASSWORD manquante dans .env.local');
    console.error('Ajoutez ADMIN_PASSWORD=votre_mot_de_passe_admin dans .env.local');
    process.exit(1);
  }

  console.log(`🔑 Connexion en tant qu'admin (${ADMIN_EMAIL})...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });

  if (authError || !authData.session) {
    console.error('❌ Erreur de connexion admin:', authError?.message || 'Session non créée');
    process.exit(1);
  }

  const adminToken = authData.session.access_token;
  console.log('✅ Connexion admin réussie');
  console.log('');

  // Appeler l'API reset-password
  console.log(`🔄 Appel de l'API pour réinitialiser le mot de passe...`);
  const response = await fetch(`${API_BASE_URL}/api/admin/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      email: email,
      newPassword: newPassword
    })
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('❌ Erreur API:', result.error || result.message || 'Erreur inconnue');
    if (result.details) {
      console.error('   Détails:', result.details);
    }
    process.exit(1);
  }

  console.log('');
  console.log('✅ ✅ ✅ MOT DE PASSE RÉINITIALISÉ AVEC SUCCÈS ✅ ✅ ✅');
  console.log('');
  console.log(`📧 Email: ${result.email || email}`);
  console.log(`🔑 Nouveau mot de passe: ${result.newPassword || newPassword}`);
  if (result.nom) {
    console.log(`👤 Nom: ${result.nom}`);
  }
  console.log('');
  console.log('⚠️  IMPORTANT: Communiquez ce mot de passe de manière sécurisée !');
}

main().catch((err) => {
  console.error('❌ Erreur inattendue:', err);
  process.exit(1);
});


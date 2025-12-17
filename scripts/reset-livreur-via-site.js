#!/usr/bin/env node

// Script qui utilise l'API route du site pour réinitialiser le mot de passe
// Il se connecte d'abord en tant qu'admin, puis appelle l'API

import { createClient } from '@supabase/supabase-js';

const email = 'livreuradmin@cvneat.fr';
const newPassword = 'livreuradmin0.';
const SUPABASE_URL = 'https://jxbqrvlmvnofaxbtcmsw.supabase.co';
const API_BASE_URL = 'https://cvneat.fr';

// Essayer de trouver les credentials admin
let ADMIN_EMAIL = process.env.ADMIN_EMAIL;
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
let SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lire depuis .env.local si disponible
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((lineRaw) => {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    if (!key || valueParts.length === 0) return;
    const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (key === 'ADMIN_EMAIL' && !ADMIN_EMAIL) ADMIN_EMAIL = value;
    if (key === 'ADMIN_PASSWORD' && !ADMIN_PASSWORD) ADMIN_PASSWORD = value;
    if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !SUPABASE_ANON_KEY) SUPABASE_ANON_KEY = value;
  });
}

// Valeurs par défaut si non trouvées
if (!ADMIN_EMAIL) {
  // Essayer les emails admin courants
  ADMIN_EMAIL = 'admin@cvneat.fr';
}

if (!SUPABASE_ANON_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY manquante');
  console.error('Ajoutez-la dans .env.local ou passez-la en variable d\'environnement');
  process.exit(1);
}

if (!ADMIN_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD manquante');
  console.error('Ajoutez ADMIN_PASSWORD=votre_mot_de_passe dans .env.local');
  console.error('Ou passez-la en variable d\'environnement: export ADMIN_PASSWORD=votre_mot_de_passe');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log(`🔐 Connexion en tant qu'admin (${ADMIN_EMAIL})...`);
  
  // Se connecter en tant qu'admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });

  if (authError || !authData.session) {
    console.error('❌ Erreur de connexion admin:', authError?.message || 'Session non créée');
    console.error('');
    console.error('Vérifiez que:');
    console.error('1. ADMIN_EMAIL est correct dans .env.local');
    console.error('2. ADMIN_PASSWORD est correct dans .env.local');
    process.exit(1);
  }

  const adminToken = authData.session.access_token;
  console.log('✅ Connexion admin réussie');
  console.log('');

  console.log(`🔄 Réinitialisation du mot de passe pour ${email}...`);
  
  // Appeler l'API reset-password
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
  console.error('❌ Erreur inattendue:', err.message);
  if (err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});


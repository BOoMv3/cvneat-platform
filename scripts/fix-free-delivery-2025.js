#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://jxbqrvlmvnofaxbtcmsw.supabase.co';
const envPath = join(process.cwd(), '.env.local');

let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY && existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((lineRaw) => {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    if (!key || valueParts.length === 0) return;
    const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !SUPABASE_SERVICE_KEY) SUPABASE_SERVICE_KEY = value;
  });
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante');
  console.error('Ajoutez-la dans .env.local ou passez-la en argument');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🔧 Correction des dates d\'expiration des gains "Livraison offerte"...\n');

  try {
    // 1. Corriger les gains dans wheel_wins
    console.log('1️⃣ Mise à jour des gains dans wheel_wins...');
    const { data: wheelWinsUpdate, error: wheelWinsError } = await supabaseAdmin
      .from('wheel_wins')
      .update({ 
        valid_until: '2025-12-23T23:59:59.999Z'
      })
      .eq('prize_type', 'free_delivery')
      .is('used_at', null)
      .not('promo_code', 'is', null)
      .lt('valid_until', '2025-01-01T00:00:00.000Z');

    if (wheelWinsError) {
      console.error('❌ Erreur lors de la mise à jour wheel_wins:', wheelWinsError);
    } else {
      console.log(`✅ ${wheelWinsUpdate?.length || 0} gains mis à jour dans wheel_wins`);
    }

    // 2. Récupérer les promo_code_id des gains non utilisés
    console.log('\n2️⃣ Récupération des codes promo à corriger...');
    const { data: wheelWins, error: fetchError } = await supabaseAdmin
      .from('wheel_wins')
      .select('promo_code_id')
      .eq('prize_type', 'free_delivery')
      .is('used_at', null)
      .not('promo_code', 'is', null);

    if (fetchError) {
      console.error('❌ Erreur lors de la récupération:', fetchError);
    } else {
      const promoCodeIds = wheelWins
        .map(w => w.promo_code_id)
        .filter(id => id !== null);

      if (promoCodeIds.length > 0) {
        console.log(`✅ ${promoCodeIds.length} codes promo à corriger`);

        // 3. Corriger les codes promo
        console.log('\n3️⃣ Mise à jour des codes promo...');
        const { data: promoCodesUpdate, error: promoCodesError } = await supabaseAdmin
          .from('promo_codes')
          .update({ 
            valid_until: '2025-12-23T23:59:59.999Z'
          })
          .in('id', promoCodeIds)
          .like('code', 'ROULETTE%')
          .eq('discount_type', 'free_delivery')
          .lt('valid_until', '2025-01-01T00:00:00.000Z');

        if (promoCodesError) {
          console.error('❌ Erreur lors de la mise à jour promo_codes:', promoCodesError);
        } else {
          console.log(`✅ ${promoCodesUpdate?.length || 0} codes promo mis à jour`);
        }
      } else {
        console.log('⚠️ Aucun code promo à corriger');
      }
    }

    // 4. Afficher les gains corrigés
    console.log('\n4️⃣ Affichage des gains corrigés...');
    const { data: correctedWins, error: displayError } = await supabaseAdmin
      .from('wheel_wins')
      .select('id, user_id, promo_code, prize_type, valid_until, used_at, created_at')
      .eq('prize_type', 'free_delivery')
      .not('promo_code', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (displayError) {
      console.error('❌ Erreur lors de l\'affichage:', displayError);
    } else {
      console.log(`\n📊 ${correctedWins?.length || 0} gains "Livraison offerte" trouvés:\n`);
      correctedWins?.forEach((win, index) => {
        const validUntil = new Date(win.valid_until);
        const now = new Date();
        const isActive = validUntil >= now && !win.used_at;
        const status = win.used_at ? 'Utilisé' : (isActive ? 'Actif' : 'Expiré');
        
        console.log(`${index + 1}. Code: ${win.promo_code}`);
        console.log(`   Expire le: ${validUntil.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`);
        console.log(`   Statut: ${status}`);
        console.log(`   Créé le: ${new Date(win.created_at).toLocaleDateString('fr-FR')}`);
        console.log('');
      });
    }

    console.log('✅ ✅ ✅ CORRECTION TERMINÉE ✅ ✅ ✅');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});


// Script pour vérifier pourquoi les publicités ne s'affichent pas
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdvertisements() {
  console.log('🔍 Vérification des publicités...\n');

  // Récupérer toutes les publicités
  const { data: ads, error } = await supabase
    .from('advertisements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  if (!ads || ads.length === 0) {
    console.log('⚠️ Aucune publicité trouvée dans la base de données');
    return;
  }

  console.log(`📊 Total de publicités: ${ads.length}\n`);

  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Date d'aujourd'hui: ${today}\n`);

  // Vérifier chaque publicité
  ads.forEach((ad, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📢 Publicité #${index + 1}: ${ad.title || 'Sans titre'}`);
    console.log(`   ID: ${ad.id}`);
    console.log(`   Position: ${ad.position}`);
    console.log(`   is_active: ${ad.is_active}`);
    console.log(`   status: ${ad.status}`);
    console.log(`   payment_status: ${ad.payment_status || 'N/A'}`);
    console.log(`   start_date: ${ad.start_date || 'Non défini'}`);
    console.log(`   end_date: ${ad.end_date || 'Non défini'}`);
    console.log(`   image_url: ${ad.image_url ? '✅ Présente' : '❌ Manquante'}`);

    // Vérifier les conditions d'affichage
    const issues = [];

    // 1. Vérifier is_active
    if (!ad.is_active) {
      issues.push('❌ is_active = false (doit être true)');
    }

    // 2. Vérifier le statut
    const validStatus = ad.status === 'approved' || ad.status === 'active';
    const validPending = ad.status === 'pending_approval' && ad.payment_status === 'paid';
    
    if (!validStatus && !validPending) {
      issues.push(`❌ Statut invalide: ${ad.status} (doit être 'approved', 'active', ou 'pending_approval' avec payment_status='paid')`);
    }

    // 3. Vérifier les dates
    if (ad.start_date) {
      const startDate = new Date(ad.start_date).toISOString().split('T')[0];
      if (today < startDate) {
        issues.push(`❌ Date de début dans le futur: ${startDate} (aujourd'hui: ${today})`);
      }
    }

    if (ad.end_date) {
      const endDate = new Date(ad.end_date).toISOString().split('T')[0];
      if (today > endDate) {
        issues.push(`❌ Date de fin dépassée: ${endDate} (aujourd'hui: ${today})`);
      }
    }

    // 4. Vérifier l'image
    if (!ad.image_url) {
      issues.push('❌ image_url manquante');
    }

    // Afficher les problèmes
    if (issues.length > 0) {
      console.log(`\n   ⚠️ PROBLÈMES DÉTECTÉS:`);
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log(`\n   ✅ Publicité valide et devrait s'afficher !`);
    }
  });

  // Résumé par position
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 RÉSUMÉ PAR POSITION:\n');

  const positions = ['banner_top', 'banner_middle', 'sidebar_left', 'sidebar_right', 'footer', 'popup'];
  
  positions.forEach(position => {
    const adsForPosition = ads.filter(ad => ad.position === position);
    const validAds = adsForPosition.filter(ad => {
      if (!ad.is_active) return false;
      const validStatus = ad.status === 'approved' || ad.status === 'active';
      const validPending = ad.status === 'pending_approval' && ad.payment_status === 'paid';
      if (!validStatus && !validPending) return false;
      
      const today = new Date().toISOString().split('T')[0];
      if (ad.start_date) {
        const startDate = new Date(ad.start_date).toISOString().split('T')[0];
        if (today < startDate) return false;
      }
      if (ad.end_date) {
        const endDate = new Date(ad.end_date).toISOString().split('T')[0];
        if (today > endDate) return false;
      }
      if (!ad.image_url) return false;
      
      return true;
    });

    console.log(`   ${position}:`);
    console.log(`      Total: ${adsForPosition.length}`);
    console.log(`      Valides: ${validAds.length}`);
    if (validAds.length > 0) {
      console.log(`      ✅ Publicité(s) valide(s) trouvée(s)`);
      validAds.forEach(ad => {
        console.log(`         - ${ad.title || 'Sans titre'} (${ad.status})`);
      });
    } else {
      console.log(`      ❌ Aucune publicité valide`);
    }
    console.log('');
  });
}

checkAdvertisements()
  .then(() => {
    console.log('\n✅ Vérification terminée');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });


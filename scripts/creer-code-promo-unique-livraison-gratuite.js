const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Générer un code unique aléatoire
function generateUniqueCode() {
  const prefix = 'LIVFREE';
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${randomPart}`;
}

async function creerCodePromoUnique() {
  console.log('🎁 Création d\'un code promo unique pour livraison gratuite...\n');

  // Générer un code unique
  let code = generateUniqueCode();
  let codeExists = true;
  let attempts = 0;
  const maxAttempts = 10;

  // Vérifier que le code n'existe pas déjà
  while (codeExists && attempts < maxAttempts) {
    const { data: existingCode } = await supabaseAdmin
      .from('promo_codes')
      .select('code')
      .eq('code', code)
      .maybeSingle();

    if (!existingCode) {
      codeExists = false;
    } else {
      code = generateUniqueCode();
      attempts++;
    }
  }

  if (codeExists) {
    console.error('❌ Impossible de générer un code unique après plusieurs tentatives');
    return;
  }

  const codeData = {
    code: code,
    description: 'Livraison offerte sur votre commande',
    discount_type: 'free_delivery',
    discount_value: 0.00,
    min_order_amount: 0.00, // Pas de minimum de commande
    max_uses: 1,            // Maximum 1 utilisation au total (1 seul client peut l'utiliser)
    max_uses_per_user: 1,   // 1 seule utilisation par utilisateur (redondant mais sécurisé)
    is_active: true,
    valid_from: new Date().toISOString(),
    valid_until: null // Pas de date d'expiration
  };

  try {
    const { data: newCode, error: insertError } = await supabaseAdmin
      .from('promo_codes')
      .insert([codeData])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erreur lors de la création:', insertError);
      return;
    }

    console.log('\n✅ Code promo unique créé avec succès !\n');
    console.log('📋 Détails du code promo:');
    console.log('   Code:', newCode.code);
    console.log('   Description:', newCode.description);
    console.log('   Type:', newCode.discount_type);
    console.log('   Utilisations max totales:', newCode.max_uses);
    console.log('   Utilisations max par client:', newCode.max_uses_per_user);
    console.log('   Statut:', newCode.is_active ? '✅ Actif' : '❌ Inactif');
    console.log('\n🎯 IMPORTANT:');
    console.log('   Ce code ne peut être utilisé qu\'UNE SEULE FOIS au total.');
    console.log('   Une fois utilisé par un client, il ne sera plus disponible.');
    console.log('   Donnez ce code à UN SEUL client pour qu\'il bénéficie de la livraison gratuite.\n');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

creerCodePromoUnique();


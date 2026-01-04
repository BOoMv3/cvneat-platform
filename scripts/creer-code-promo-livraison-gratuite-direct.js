const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function creerCodePromoLivraisonGratuite() {
  console.log('🎁 Création du code promo "Livraison Gratuite"...\n');

  const codeData = {
    code: 'LIVRAISONFREE',
    description: 'Livraison offerte sur votre commande',
    discount_type: 'free_delivery',
    discount_value: 0.00,
    min_order_amount: 0.00, // Pas de minimum de commande (ou vous pouvez mettre 15.00)
    max_uses_per_user: 1,   // 1 seule utilisation par client
    is_active: true,
    valid_from: new Date().toISOString(),
    valid_until: null // Pas de date d'expiration (ou vous pouvez mettre une date)
  };

  try {
    // Vérifier si le code existe déjà
    const { data: existingCode, error: checkError } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('code', codeData.code)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Erreur lors de la vérification:', checkError);
      return;
    }

    if (existingCode) {
      console.log('⚠️  Le code promo existe déjà. Mise à jour...');
      
      const { data: updatedCode, error: updateError } = await supabaseAdmin
        .from('promo_codes')
        .update({
          description: codeData.description,
          discount_type: codeData.discount_type,
          discount_value: codeData.discount_value,
          min_order_amount: codeData.min_order_amount,
          max_uses_per_user: codeData.max_uses_per_user,
          is_active: codeData.is_active,
          valid_from: codeData.valid_from,
          valid_until: codeData.valid_until,
          updated_at: new Date().toISOString()
        })
        .eq('code', codeData.code)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erreur lors de la mise à jour:', updateError);
        return;
      }

      console.log('\n✅ Code promo mis à jour avec succès !');
      console.log('   Code:', updatedCode.code);
      console.log('   Description:', updatedCode.description);
      console.log('   Type:', updatedCode.discount_type);
      console.log('   Utilisations max par client:', updatedCode.max_uses_per_user);
      console.log('   Statut:', updatedCode.is_active ? '✅ Actif' : '❌ Inactif');
    } else {
      // Créer le code promo
      const { data: newCode, error: insertError } = await supabaseAdmin
        .from('promo_codes')
        .insert([codeData])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erreur lors de la création:', insertError);
        return;
      }

      console.log('\n✅ Code promo créé avec succès !');
      console.log('   Code:', newCode.code);
      console.log('   Description:', newCode.description);
      console.log('   Type:', newCode.discount_type);
      console.log('   Utilisations max par client:', newCode.max_uses_per_user);
      console.log('   Statut:', newCode.is_active ? '✅ Actif' : '❌ Inactif');
    }

    console.log('\n📋 Le code promo est maintenant disponible pour les clients !');
    console.log('   Les clients peuvent l\'utiliser 1 seule fois chacun.');
    console.log('   Il offre la livraison gratuite sur leur commande.');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

creerCodePromoLivraisonGratuite();


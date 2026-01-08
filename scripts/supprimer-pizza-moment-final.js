const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function supprimer() {
  try {
    const restaurantId = 'd6725fe6-59ec-413a-b39b-ddb960824999';
    
    console.log('🔍 Recherche de "pizza du moment"...\n');
    
    // Rechercher tous les items contenant "moment" ou "jour"
    const { data: items, error } = await supabaseAdmin
      .from('menus')
      .select('id, nom, category, prix, disponible')
      .eq('restaurant_id', restaurantId)
      .or('nom.ilike.%moment%,nom.ilike.%jour%')
      .order('nom', { ascending: true });

    if (error) throw error;

    if (!items || items.length === 0) {
      console.log('⚠️  Aucun item avec "moment" ou "jour" trouvé.');
      return;
    }

    console.log('📋 Items trouvés:\n');
    items.forEach(item => {
      console.log(`  - "${item.nom}" (${item.prix}€) - Catégorie: "${item.category}" - ${item.disponible ? '✅ Disponible' : '❌ Indisponible'} - ID: ${item.id}`);
    });

    // Supprimer tous les items trouvés
    console.log('\n🗑️  Suppression...\n');
    for (const item of items) {
      const { error: deleteError } = await supabaseAdmin
        .from('menus')
        .delete()
        .eq('id', item.id);

      if (deleteError) {
        console.error(`❌ Erreur suppression "${item.nom}": ${deleteError.message}`);
      } else {
        console.log(`✅ "${item.nom}" supprimée avec succès`);
      }
    }

    console.log('\n✅ Opération terminée');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

supprimer();

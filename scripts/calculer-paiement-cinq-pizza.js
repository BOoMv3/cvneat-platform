const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function calculerPaiementCinqPizza() {
  console.log('💰 Calcul du montant dû au Cinq Pizza Shop (hors commandes d\'hier soir)...\n');

  try {
    // Trouver le restaurant "Le Cinq Pizza Shop"
    const { data: restaurants, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom')
      .ilike('nom', '%cinq%pizza%');

    if (restaurantError || !restaurants || restaurants.length === 0) {
      console.error('❌ Restaurant "Le Cinq Pizza Shop" non trouvé');
      return;
    }

    const restaurant = restaurants[0];
    console.log(`✅ Restaurant trouvé: ${restaurant.nom} (${restaurant.id})\n`);

    // Définir la date d'hier soir (hier à partir de 18h)
    const maintenant = new Date();
    const hierSoir = new Date(maintenant);
    hierSoir.setDate(hierSoir.getDate() - 1);
    hierSoir.setHours(18, 0, 0, 0); // Hier soir à partir de 18h

    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0); // Aujourd'hui à 00h00

    console.log(`📅 Période exclue (hier soir): ${hierSoir.toLocaleString('fr-FR')} à ${aujourdhui.toLocaleString('fr-FR')}\n`);

    // Récupérer toutes les commandes payées/livrées du restaurant
    // Exclure les commandes d'hier soir (après 18h hier jusqu'à aujourd'hui 00h)
    const { data: commandes, error: commandesError } = await supabaseAdmin
      .from('commandes')
      .select(`
        id,
        created_at,
        total,
        restaurant_payout,
        commission_rate,
        commission_amount,
        payment_status,
        statut,
        frais_livraison
      `)
      .eq('restaurant_id', restaurant.id)
      .in('payment_status', ['paid', 'succeeded'])
      .not('statut', 'eq', 'annulee')
      .or('statut.eq.livree,statut.eq.en_livraison,statut.eq.en_preparation,statut.eq.en_attente')
      .order('created_at', { ascending: true });

    if (commandesError) {
      console.error('❌ Erreur récupération commandes:', commandesError);
      return;
    }

    console.log(`📦 ${commandes.length} commandes payées trouvées\n`);

    // Filtrer les commandes (exclure hier soir)
    const commandesAPayer = commandes.filter(commande => {
      const dateCommande = new Date(commande.created_at);
      // Exclure si la commande est entre hier 18h et aujourd'hui 00h
      return !(dateCommande >= hierSoir && dateCommande < aujourdhui);
    });

    const commandesExclues = commandes.filter(commande => {
      const dateCommande = new Date(commande.created_at);
      return dateCommande >= hierSoir && dateCommande < aujourdhui;
    });

    console.log(`📊 ${commandesAPayer.length} commandes à inclure dans le paiement`);
    console.log(`🚫 ${commandesExclues.length} commande(s) d'hier soir exclue(s)\n`);

    // Afficher les commandes exclues
    if (commandesExclues.length > 0) {
      console.log('🚫 Commandes exclues (hier soir):');
      console.log('─'.repeat(80));
      for (const cmd of commandesExclues) {
        const date = new Date(cmd.created_at).toLocaleString('fr-FR');
        const payout = parseFloat(cmd.restaurant_payout || 0);
        console.log(`   ${date} | #${cmd.id.slice(0, 8)} | ${payout.toFixed(2)}€ | Statut: ${cmd.statut}`);
      }
      console.log('─'.repeat(80) + '\n');
    }

    // Calculer le total dû
    let totalPayout = 0;
    let totalCommission = 0;
    let totalCommandes = 0;

    for (const commande of commandesAPayer) {
      const payout = parseFloat(commande.restaurant_payout || 0);
      const commission = parseFloat(commande.commission_amount || 0);
      
      if (payout > 0) {
        totalPayout += payout;
        totalCommission += commission;
        totalCommandes += 1;
      }
    }

    // Arrondir à 2 décimales
    totalPayout = Math.round(totalPayout * 100) / 100;
    totalCommission = Math.round(totalCommission * 100) / 100;

    console.log('='.repeat(80));
    console.log('💰 RÉSUMÉ DU PAIEMENT');
    console.log('='.repeat(80));
    console.log(`Restaurant: ${restaurant.nom}`);
    console.log(`Nombre de commandes: ${totalCommandes}`);
    console.log(`Total commission CVN'EAT: ${totalCommission.toFixed(2)}€`);
    console.log(`💰 MONTANT TOTAL À PAYER: ${totalPayout.toFixed(2)}€`);
    console.log('='.repeat(80) + '\n');

    // Afficher quelques détails si nécessaire
    if (commandesAPayer.length <= 20) {
      console.log('📋 Détail des commandes incluses:');
      console.log('─'.repeat(80));
      for (const cmd of commandesAPayer) {
        const date = new Date(cmd.created_at).toLocaleString('fr-FR');
        const payout = parseFloat(cmd.restaurant_payout || 0);
        const total = parseFloat(cmd.total || 0);
        const commission = parseFloat(cmd.commission_amount || 0);
        console.log(`   ${date} | #${cmd.id.slice(0, 8)} | Total: ${total.toFixed(2)}€ | Commission: ${commission.toFixed(2)}€ | Paiement: ${payout.toFixed(2)}€ | ${cmd.statut}`);
      }
      console.log('─'.repeat(80) + '\n');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

calculerPaiementCinqPizza();


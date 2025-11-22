import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Créer un client avec le service role pour contourner RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUserFromRequest(request) {
  try {
    const authHeader = request.headers.get('authorization');
    console.log('🔍 DEBUG getUserFromRequest - AuthHeader:', authHeader ? 'Présent' : 'Absent');
    
    const token = authHeader?.split(' ')[1];
    console.log('🔍 DEBUG getUserFromRequest - Token:', token ? 'Présent' : 'Absent');
    
    if (!token) {
      console.error('❌ Aucun token trouvé');
      return null;
    }
    
    // Vérifier le token avec Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('🔍 DEBUG getUserFromRequest - User:', user ? user.id : 'Aucun utilisateur');
    console.log('🔍 DEBUG getUserFromRequest - Error:', error);
    
    if (error || !user) {
      console.error('❌ Erreur ou utilisateur manquant:', error);
      return null;
    }

    // Vérifier le rôle dans la table users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    console.log('🔍 DEBUG getUserFromRequest - UserData:', userData);
    console.log('🔍 DEBUG getUserFromRequest - UserError:', userError);

    if (userError || !userData) {
      console.error('❌ Erreur récupération rôle:', userError);
      return null;
    }

    return { ...user, role: userData.role };
  } catch (error) {
    console.error('❌ Erreur authentification:', error);
    return null;
  }
}

export async function GET(request) {
  try {
    console.log('=== API PARTNER ORDERS GET ===');
    console.log('Headers:', request.headers.get('authorization') ? 'Token présent' : 'Token manquant');
    
    const user = await getUserFromRequest(request);
    console.log('User récupéré:', user ? user.id : 'Aucun utilisateur');

    if (!user) {
      console.error('❌ Aucun utilisateur trouvé');
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    if (!['restaurant', 'partner'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès non autorisé - Rôle restaurant requis' }, { status: 403 });
    }

    // Récupérer l'ID du restaurant associé à l'utilisateur partenaire
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurantData) {
      console.error('❌ Restaurant non trouvé pour user_id:', user.id);
      console.error('Erreur:', restaurantError);
      return NextResponse.json({ error: 'Restaurant non trouvé pour ce partenaire' }, { status: 404 });
    }

    const restaurantId = restaurantData.id;
    console.log('✅ Restaurant trouvé:', restaurantId, 'pour user:', user.id);

    // Récupérer les commandes du restaurant
    console.log('🔍 Recherche commandes pour restaurant_id:', restaurantId);
    
    // DEBUG : Tester d'abord une requête simple pour voir les colonnes disponibles
    console.log('🔍 Test requête simple avec admin...');
    const { data: simpleOrders, error: simpleError } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, total, frais_livraison')
      .eq('restaurant_id', restaurantId)
      .limit(1);
    
    console.log('🔍 Résultat requête simple (admin):', simpleOrders?.length || 0, 'commandes');
    console.log('🔍 Erreur requête simple (admin):', simpleError);
    if (simpleOrders && simpleOrders.length > 0) {
      console.log('📊 Exemple commande:', JSON.stringify(simpleOrders[0], null, 2));
    }
    
    // Maintenant la requête complète avec JOIN avec le client admin
    // IMPORTANT: La colonne s'appelle 'total' (pas total_amount) dans la table commandes
    // Utiliser total et frais_livraison uniquement
    // Note: La relation users peut échouer si la foreign key n'existe pas, donc on la rend optionnelle
    let orders = [];
    let ordersError = null;
    
    try {
      // Requête simplifiée - commencer avec les colonnes de base seulement
      // Éviter les colonnes qui pourraient ne pas exister (customer_*, delivery_*)
      console.log('🔍 Requête commandes pour restaurant_id:', restaurantId);
      const { data: ordersData, error: ordersErrorData } = await supabaseAdmin
        .from('commandes')
        .select(`
          id,
          created_at,
          updated_at,
          statut,
          total,
          frais_livraison,
          restaurant_id,
          user_id,
          livreur_id,
          adresse_livraison,
          preparation_time,
          ready_for_delivery,
          details_commande (
            id,
            plat_id,
            quantite,
            prix_unitaire,
            supplements,
            customizations,
            menus (
              nom,
              prix
            )
          )
        `)
      .eq('restaurant_id', restaurantId)
      .eq('payment_status', 'paid') // IMPORTANT: Seulement les commandes payées
        .order('created_at', { ascending: false });
      
      // Log immédiat après la requête
      if (ordersErrorData) {
        console.error('❌ Erreur requête Supabase:', ordersErrorData);
      } else {
        console.log(`✅ Requête réussie: ${ordersData?.length || 0} commandes`);
        if (ordersData && ordersData.length > 0) {
          // Vérifier si les détails sont récupérés
          ordersData.forEach(order => {
            const hasDetails = order.details_commande && Array.isArray(order.details_commande) && order.details_commande.length > 0;
            console.log(`   Commande ${order.id?.slice(0, 8)}: détails récupérés = ${hasDetails}`);
            if (!hasDetails) {
              console.warn(`   ⚠️ Détails manquants pour ${order.id?.slice(0, 8)}`);
            }
          });
        }
      }

      ordersError = ordersErrorData;
      orders = ordersData || [];
      
      // Log pour debug des détails de commande
      if (orders.length > 0) {
        console.log(`✅ ${orders.length} commandes récupérées depuis BDD`);
        
        // Récupérer les détails séparément si la relation n'a pas fonctionné
        const orderIds = orders.map(o => o.id).filter(Boolean);
        if (orderIds.length > 0) {
          try {
            console.log(`🔍 Recherche détails pour ${orderIds.length} commandes:`, orderIds.map(id => id?.slice(0, 8)));
            
            const { data: allDetails, error: detailsError } = await supabaseAdmin
              .from('details_commande')
              .select(`
                id,
                commande_id,
                plat_id,
                quantite,
                prix_unitaire,
                supplements,
                customizations,
                menus (
                  nom,
                  prix
                )
              `)
              .in('commande_id', orderIds);
            
            console.log(`🔍 Résultat requête détails:`, {
              count: allDetails?.length || 0,
              error: detailsError ? detailsError.message : null,
              hasData: !!allDetails,
              sampleDetail: allDetails && allDetails.length > 0 ? {
                id: allDetails[0].id,
                commande_id: allDetails[0].commande_id?.slice(0, 8),
                plat_id: allDetails[0].plat_id,
                quantite: allDetails[0].quantite
              } : null
            });
            
            if (!detailsError && allDetails && allDetails.length > 0) {
              console.log(`✅ ${allDetails.length} détails récupérés séparément depuis BDD`);
              console.log(`   IDs des commandes avec détails:`, [...new Set(allDetails.map(d => d.commande_id))].map(id => id?.slice(0, 8)));
              
              // Grouper les détails par commande_id
              const detailsByOrderId = new Map();
              allDetails.forEach(detail => {
                if (!detailsByOrderId.has(detail.commande_id)) {
                  detailsByOrderId.set(detail.commande_id, []);
                }
                detailsByOrderId.get(detail.commande_id).push(detail);
              });
              
              // Ajouter les détails aux commandes qui n'en ont pas
              orders = orders.map(order => {
                const existingDetails = order.details_commande || [];
                const additionalDetails = detailsByOrderId.get(order.id) || [];
                
                // Log pour chaque commande
                console.log(`   Commande ${order.id?.slice(0, 8)}: détails existants=${existingDetails.length}, détails séparés=${additionalDetails.length}`);
                
                // Si pas de détails via la relation mais qu'on en a trouvés séparément
                if (existingDetails.length === 0 && additionalDetails.length > 0) {
                  console.log(`✅ Détails récupérés séparément pour commande ${order.id?.slice(0, 8)}: ${additionalDetails.length} détails`);
                  return {
                    ...order,
                    details_commande: additionalDetails
                  };
                }
                
                return order;
              });
            } else if (detailsError) {
              console.error('❌ Erreur récupération détails séparés:', detailsError);
              console.error('   Détails de l\'erreur:', JSON.stringify(detailsError, null, 2));
            } else {
              console.warn(`⚠️ Aucun détail trouvé en BDD pour ${orderIds.length} commandes`);
              console.warn(`   IDs des commandes recherchées:`, orderIds.map(id => id?.slice(0, 8)));
            }
          } catch (detailsFetchError) {
            console.error('❌ Erreur lors de la récupération séparée des détails:', detailsFetchError);
          }
        }
        
        orders.forEach(order => {
          const detailsCount = order.details_commande?.length || 0;
          console.log(`📋 Commande ${order.id?.slice(0, 8)}: ${detailsCount} détails dans BDD`);
          if (detailsCount === 0) {
            console.warn(`⚠️ PROBLÈME: Commande ${order.id?.slice(0, 8)} sans détails dans la BDD !`);
          } else {
            console.log(`   ✅ Premier détail:`, order.details_commande[0]);
          }
        });
      }

      // Essayer de récupérer les infos users séparément pour éviter les erreurs de relation
      if (orders.length > 0 && !ordersError) {
        const userIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];
        console.log('🔍 DEBUG - UserIds à récupérer:', userIds);
        if (userIds.length > 0) {
          try {
            const { data: usersData, error: usersError } = await supabaseAdmin
              .from('users')
              .select('id, nom, prenom, telephone, email')
              .in('id', userIds);
            
            console.log('🔍 DEBUG - UsersData récupérés:', usersData?.length || 0);
            if (usersData && usersData.length > 0) {
              console.log('🔍 DEBUG - Exemple user:', JSON.stringify(usersData[0], null, 2));
            }
            if (usersError) {
              console.error('❌ Erreur récupération users:', usersError);
            }
            
            // Mapper les users aux commandes
            if (usersData && usersData.length > 0) {
              const usersMap = new Map(usersData.map(u => [u.id, u]));
              orders = orders.map(order => {
                const userData = usersMap.get(order.user_id);
                console.log(`🔍 DEBUG - Commande ${order.id?.slice(0, 8)}: user_id=${order.user_id}, userData=${userData ? `${userData.prenom} ${userData.nom}` : 'null'}`);
                return {
                  ...order,
                  users: userData || null
                };
              });
            }
          } catch (userError) {
            console.error('❌ Erreur récupération users (non bloquant):', userError);
            // Continuer sans les données users
          }
        }
      }
    } catch (queryError) {
      console.error('❌ Erreur lors de la requête commandes:', queryError);
      ordersError = queryError;
    }

    if (ordersError) {
      console.error('❌ Erreur récupération commandes:', ordersError);
      console.error('❌ Détails erreur:', JSON.stringify(ordersError, null, 2));
      return NextResponse.json({ 
        error: 'Erreur lors de la récupération des commandes',
        details: ordersError.message 
      }, { status: 500 });
    }

    console.log('✅ Commandes trouvées:', orders?.length || 0);
    
    // Vérifier les commandes sans détails AVANT le formatage
    const ordersWithoutDetails = (orders || []).filter(o => !o.details_commande || !Array.isArray(o.details_commande) || o.details_commande.length === 0);
    if (ordersWithoutDetails.length > 0) {
      console.log(`🔍 Vérification directe BDD pour ${ordersWithoutDetails.length} commandes sans détails...`);
      
      // Vérifier directement en BDD pour chaque commande sans détails
      for (const order of ordersWithoutDetails) {
        try {
          const { data: directCheck, error: checkError } = await supabaseAdmin
            .from('details_commande')
            .select('id, commande_id, plat_id, quantite, prix_unitaire')
            .eq('commande_id', order.id)
            .limit(5);
          
          if (checkError) {
            console.error(`   ❌ Commande ${order.id?.slice(0, 8)}: Erreur vérification BDD:`, checkError.message);
          } else {
            if (directCheck && directCheck.length > 0) {
              console.error(`   ❌ PROBLÈME CRITIQUE - Commande ${order.id?.slice(0, 8)}: ${directCheck.length} détails EXISTENT en BDD mais ne sont PAS récupérés !`);
              console.error(`      Exemple:`, directCheck[0]);
              
              // Essayer de récupérer les détails avec la relation menus
              const { data: fullDetails, error: fullError } = await supabaseAdmin
                .from('details_commande')
                .select(`
                  id,
                  commande_id,
                  plat_id,
                  quantite,
                  prix_unitaire,
                  supplements,
                  customizations,
                  menus (
                    nom,
                    prix
                  )
                `)
                .eq('commande_id', order.id);
              
              if (!fullError && fullDetails && fullDetails.length > 0) {
                console.log(`      ✅ Récupération complète réussie: ${fullDetails.length} détails avec menus`);
                // Ajouter les détails à la commande
                const orderIndex = orders.findIndex(o => o.id === order.id);
                if (orderIndex !== -1) {
                  orders[orderIndex].details_commande = fullDetails;
                  console.log(`      ✅ Détails ajoutés à la commande ${order.id?.slice(0, 8)}`);
                }
              } else {
                console.error(`      ❌ Impossible de récupérer les détails avec menus:`, fullError?.message);
              }
            } else {
              console.warn(`   ⚠️ CONFIRMÉ - Commande ${order.id?.slice(0, 8)}: Aucun détail n'existe en BDD - ils n'ont jamais été créés.`);
            }
          }
        } catch (checkErr) {
          console.error(`   ❌ Exception lors vérification commande ${order.id?.slice(0, 8)}:`, checkErr.message);
        }
      }
    }

    const formattedOrders = (orders || []).map(order => {
      const subtotal = parseFloat(order.total || 0) || 0;
      const deliveryFee = parseFloat(order.frais_livraison || 0) || 0;
      const totalAmount = subtotal + deliveryFee;

      // IMPORTANT: Log pour debug si détails manquants
      if (!order.details_commande || order.details_commande.length === 0) {
        console.warn(`⚠️ API: Commande ${order.id?.slice(0, 8)} sans détails lors du formatage`);
        console.warn(`   order.details_commande:`, order.details_commande);
      }
      
      // Créer les orderItems depuis details_commande
      const orderItems = (order.details_commande || []).map(detail => {
        let supplements = [];
        if (detail.supplements) {
          if (typeof detail.supplements === 'string') {
            try {
              supplements = JSON.parse(detail.supplements);
            } catch {
              supplements = [];
            }
          } else if (Array.isArray(detail.supplements)) {
            supplements = detail.supplements;
          }
        }

        let customizations = {};
        if (detail.customizations) {
          if (typeof detail.customizations === 'string') {
            try {
              customizations = JSON.parse(detail.customizations);
            } catch {
              customizations = {};
            }
          } else if (typeof detail.customizations === 'object') {
            customizations = detail.customizations;
          }
        }

        return {
          id: detail.id,
          plat_id: detail.plat_id,
          name: detail.menus?.nom || 'Article',
          quantity: detail.quantite || 0,
          price: parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0,
          supplements,
          customizations,
          // Garder aussi les champs bruts pour compatibilité
          quantite: detail.quantite,
          prix_unitaire: detail.prix_unitaire,
          menus: detail.menus
        };
      });

      // Log pour debug si pas de détails
      if (!order.details_commande || !Array.isArray(order.details_commande) || order.details_commande.length === 0) {
        console.warn(`⚠️ Commande ${order.id?.slice(0, 8)} : Pas de détails de commande trouvés après récupération et formatage`);
        console.warn(`   Type:`, typeof order.details_commande);
        console.warn(`   Est tableau:`, Array.isArray(order.details_commande));
        console.warn(`   Valeur brute:`, JSON.stringify(order.details_commande, null, 2));
      } else {
        console.log(`✅ Commande ${order.id?.slice(0, 8)} : ${order.details_commande.length} détails trouvés`);
      }

      // PRIORITÉ ABSOLUE: Données stockées dans la commande (customer_first_name, customer_last_name)
      // Ces données sont toujours correctes car stockées au moment de la commande
      // Ne PAS utiliser order.users?.nom qui peut être "Utilisateur" pour des comptes dupliqués
      const customerFirstName = order.customer_first_name || '';
      const customerLastName = order.customer_last_name || '';
      const customerPhone = order.customer_phone || order.users?.telephone || '';
      const customerEmail = order.customer_email || order.users?.email || '';
      
      // Construire le nom complet du client
      // TOUJOURS prioriser les données stockées dans la commande
      let customerName = '';
      if (customerFirstName && customerLastName) {
        customerName = `${customerFirstName} ${customerLastName}`.trim();
      } else if (customerLastName && customerLastName !== 'Utilisateur' && customerLastName.trim() !== '') {
        customerName = customerLastName.trim();
      } else if (customerFirstName && customerFirstName !== 'Utilisateur' && customerFirstName.trim() !== '') {
        customerName = customerFirstName.trim();
      } else if (customerEmail) {
        customerName = customerEmail;
      } else {
        // Fallback: utiliser users seulement si pas de données dans la commande
        const fallbackFirstName = order.users?.prenom || '';
        const fallbackLastName = order.users?.nom || '';
        if (fallbackFirstName && fallbackLastName && fallbackLastName !== 'Utilisateur') {
          customerName = `${fallbackFirstName} ${fallbackLastName}`.trim();
        } else if (fallbackLastName && fallbackLastName !== 'Utilisateur') {
          customerName = fallbackLastName;
        } else {
          customerName = 'Client';
        }
      }
      
      // Log pour debug
      if (order.id) {
        console.log(`🔍 DEBUG - Commande ${order.id.slice(0, 8)}: customer_first_name=${order.customer_first_name}, customer_last_name=${order.customer_last_name}, name=${customerName}`);
      }

      return {
        ...order,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        total: subtotal,
        order_items: orderItems,
        items: orderItems, // Alias pour compatibilité
        details_commande: order.details_commande || [], // Garder les détails bruts pour compatibilité
        customer_first_name: customerFirstName,
        customer_last_name: customerLastName,
        customer_name: customerName, // Nom complet formaté
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer: {
          firstName: customerFirstName,
          lastName: customerLastName,
          phone: customerPhone,
          email: customerEmail
        },
        // Ajouter aussi un objet user pour compatibilité avec l'ancien code
        user: order.users ? {
          nom: order.users.nom || customerLastName,
          prenom: order.users.prenom || customerFirstName,
          telephone: order.users.telephone || customerPhone,
          email: order.users.email || customerEmail
        } : null
      };
    });
    
    return NextResponse.json(formattedOrders);

  } catch (error) {
    console.error('Erreur API (orders partner):', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Accepter une commande avec estimation du temps
export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (!['restaurant', 'partner'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès refusé - Rôle restaurant requis' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, preparationTime, deliveryTime, estimatedTotalTime } = body;

    if (!orderId || !preparationTime || !deliveryTime || !estimatedTotalTime) {
      return NextResponse.json({ 
        error: 'Tous les champs sont requis: orderId, preparationTime, deliveryTime, estimatedTotalTime' 
      }, { status: 400 });
    }

    // Récupérer le restaurant du partenaire
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Vérifier que la commande appartient à ce restaurant
    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .eq('restaurant_id', restaurant.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    if (order.statut !== 'en_attente') {
      return NextResponse.json({ error: 'Cette commande ne peut plus être modifiée' }, { status: 400 });
    }

    // Mettre à jour la commande avec les estimations de temps
    const { data: updatedOrder, error: updateError } = await supabase
      .from('commandes')
      .update({
        statut: 'acceptee',
        preparation_time: preparationTime,
        delivery_time: deliveryTime,
        estimated_total_time: estimatedTotalTime,
        accepted_at: new Date().toISOString(),
        accepted_by: user.id
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour commande:', updateError);
      return NextResponse.json({ error: 'Erreur lors de l\'acceptation de la commande' }, { status: 500 });
    }

    // Envoyer une notification au client
    try {
      const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(order.user_id);
      if (clientUser) {
        // Ici vous pouvez envoyer une notification push ou email au client
        console.log('Notification envoyée au client:', clientUser.email);
      }
    } catch (notificationError) {
      console.error('Erreur notification client:', notificationError);
    }

    return NextResponse.json({
      message: 'Commande acceptée avec succès',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Erreur API acceptation commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
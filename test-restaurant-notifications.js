// SCRIPT POUR TESTER LES NOTIFICATIONS RESTAURANT
// À exécuter dans la console du navigateur sur la page restaurant

async function testRestaurantNotifications() {
  console.log('🧪 TEST DES NOTIFICATIONS RESTAURANT');
  
  try {
    // 1. Vérifier la session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ Aucune session active');
      return;
    }
    
    console.log('✅ Session active:', session.user.email);
    
    // 2. Vérifier la connexion SSE
    const eventSource = new EventSource(`/api/partner/notifications/sse?restaurantId=4572cee6-1fc6-4f32-b007-57c46871ec70&token=${session.access_token}`);
    
    eventSource.onopen = () => {
      console.log('✅ Connexion SSE établie');
    };
    
    eventSource.onmessage = (event) => {
      console.log('🔔 Notification reçue:', event.data);
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_order') {
        console.log('🎉 NOUVELLE COMMANDE DÉTECTÉE !');
        console.log('📋 Commande:', data.order);
        
        // Test d'alerte sonore
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGwU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.play().catch(e => console.log('🔇 Son désactivé:', e));
        
        // Test d'alerte visuelle
        alert('🔔 NOUVELLE COMMANDE !\n\nCommande #' + data.order.id + '\nTotal: ' + data.order.total + '€');
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('❌ Erreur SSE:', error);
    };
    
    // 3. Simuler une nouvelle commande (pour test)
    console.log('⏳ En attente de nouvelles commandes...');
    console.log('💡 Pour tester, passez une commande depuis le site client');
    
    // 4. Vérifier les boutons Accepter/Refuser
    const acceptButtons = document.querySelectorAll('[data-action="accept"]');
    const rejectButtons = document.querySelectorAll('[data-action="reject"]');
    
    console.log('🔘 Boutons Accepter trouvés:', acceptButtons.length);
    console.log('🔘 Boutons Refuser trouvés:', rejectButtons.length);
    
    if (acceptButtons.length > 0) {
      console.log('✅ Boutons Accepter/Refuser présents dans le DOM');
    } else {
      console.log('⚠️ Aucun bouton Accepter/Refuser trouvé');
    }
    
  } catch (error) {
    console.error('❌ Erreur test notifications:', error);
  }
}

// Exécuter le test
testRestaurantNotifications();

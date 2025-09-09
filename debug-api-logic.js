// Diagnostic approfondi de la logique de l'API
// À exécuter dans la console du navigateur sur le dashboard livreur

console.log('🔍 Diagnostic approfondi de la logique de l\'API...');

// Fonction pour tester l'API et diagnostiquer
async function debugAPILogic() {
  try {
    const token = JSON.parse(localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token')).access_token;
    
    console.log('📡 Appel de l\'API des alertes...');
    const response = await fetch('/api/delivery/preparation-alerts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Statut:', response.status);
    const data = await response.json();
    console.log('📊 Données reçues:', data);
    
    if (data.success && data.count === 0) {
      console.log('❌ L\'API ne trouve aucune commande en préparation');
      console.log('🔍 Diagnostic possible :');
      console.log('  1. L\'API ne filtre pas par delivery_id spécifique');
      console.log('  2. La commande #2003 n\'a pas le bon delivery_id');
      console.log('  3. L\'API ne trouve pas la commande dans la base');
      console.log('  4. Le calcul du temps restant est incorrect');
      
      // Vérifier le delivery_id du token
      console.log('🔑 Vérification du delivery_id du token...');
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔑 Payload du token:', tokenPayload);
        console.log('🔑 User ID du token:', tokenPayload.sub);
      } catch (e) {
        console.error('❌ Erreur décodage token:', e);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter le diagnostic
debugAPILogic();

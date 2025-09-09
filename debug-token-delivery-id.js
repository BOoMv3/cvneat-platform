// Debug du delivery_id dans le token
// À exécuter dans la console du navigateur sur /delivery/dashboard

console.log('🔍 Debug du delivery_id dans le token');

// Récupérer le token d'authentification
const supabaseToken = localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token');
console.log('🔑 Token trouvé:', supabaseToken ? 'OUI' : 'NON');

if (supabaseToken) {
  try {
    // Décoder le token JWT
    const tokenPayload = JSON.parse(atob(supabaseToken.split('.')[1]));
    console.log('🔑 Payload du token:', tokenPayload);
    console.log('🔑 Delivery ID du token:', tokenPayload.sub);
    console.log('🔑 User ID du token:', tokenPayload.user_id);
    console.log('🔑 Email du token:', tokenPayload.email);
  } catch (error) {
    console.error('❌ Erreur décodage token:', error);
  }
} else {
  console.error('❌ Aucun token trouvé');
}

// Vérifier aussi les autres clés possibles
console.log('🔍 Toutes les clés localStorage:');
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('auth')) {
    console.log(`🔑 ${key}:`, localStorage.getItem(key));
  }
});

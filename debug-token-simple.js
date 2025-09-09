// Debug simple du token
// À exécuter dans la console du navigateur sur /delivery/dashboard

console.log('🔍 Debug du token');

// Récupérer le token d'authentification
const supabaseToken = localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token');
console.log('🔑 Token trouvé:', supabaseToken ? 'OUI' : 'NON');

if (supabaseToken) {
  try {
    // Décoder le token JWT
    const tokenPayload = JSON.parse(atob(supabaseToken.split('.')[1]));
    console.log('🔑 Delivery ID du token:', tokenPayload.sub);
    console.log('🔑 Email du token:', tokenPayload.email);
  } catch (error) {
    console.error('❌ Erreur décodage token:', error);
  }
}

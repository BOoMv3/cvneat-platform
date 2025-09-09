// Diagnostic du token d'authentification
// À exécuter dans la console du navigateur sur le dashboard livreur

console.log('🔍 Diagnostic du token d\'authentification...');

// Vérifier tous les éléments de localStorage
console.log('📦 Contenu du localStorage:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`  ${key}: ${value ? value.substring(0, 50) + '...' : 'null'}`);
}

// Vérifier sessionStorage aussi
console.log('📦 Contenu du sessionStorage:');
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  const value = sessionStorage.getItem(key);
  console.log(`  ${key}: ${value ? value.substring(0, 50) + '...' : 'null'}`);
}

// Vérifier les cookies
console.log('🍪 Cookies:');
console.log(document.cookie);

// Vérifier si l'utilisateur est connecté
console.log('👤 Vérification de l\'utilisateur connecté:');
console.log('  - localStorage.getItem("token"):', localStorage.getItem('token'));
console.log('  - localStorage.getItem("user"):', localStorage.getItem('user'));
console.log('  - localStorage.getItem("authToken"):', localStorage.getItem('authToken'));
console.log('  - localStorage.getItem("access_token"):', localStorage.getItem('access_token'));
console.log('  - localStorage.getItem("supabase.auth.token"):', localStorage.getItem('supabase.auth.token'));

// Vérifier les variables globales
console.log('🌐 Variables globales:');
console.log('  - window.user:', window.user);
console.log('  - window.token:', window.token);
console.log('  - window.authToken:', window.authToken);

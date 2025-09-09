// Test direct de l'API chat
// Exécuter ce script dans la console du navigateur sur /delivery/dashboard

console.log('🔍 Test direct de l\'API chat...');

// Test 1: Vérifier la session Supabase
const { createClient } = window.supabase || {};
if (!createClient) {
  console.error('❌ Supabase client non disponible');
} else {
  const supabase = createClient(
    'https://jxbqrvlmvnofaxbtcmsw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4YnFydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ4NzcsImV4cCI6MjA1MDA1MDg3N30.G7iFlb2vKi1ouABfyI_azLbZ8XGi66tf9kx_dtVIE40'
  );

  // Test session
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      console.error('❌ Erreur session:', error);
    } else if (session) {
      console.log('✅ Session trouvée:', session.user.email);
      console.log('🔑 Token:', session.access_token.substring(0, 20) + '...');
      
      // Test récupération messages
      fetch('/api/chat/6001', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      .then(response => {
        console.log('📡 Statut récupération:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('📊 Messages reçus:', data);
      })
      .catch(error => {
        console.error('❌ Erreur récupération:', error);
      });
      
    } else {
      console.error('❌ Aucune session trouvée');
    }
  });
}

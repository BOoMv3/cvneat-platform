// Test détaillé de l'API chat
// Exécuter ce script dans la console du navigateur sur /delivery/dashboard

console.log('🔍 Test détaillé de l\'API chat...');

// Test 1: Vérifier la session
const { createClient } = window.supabase || {};
if (!createClient) {
  console.error('❌ Supabase client non disponible');
} else {
  const supabase = createClient(
    'https://jxbqrvlmvnofaxbtcmsw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4YnFydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ4NzcsImV4cCI6MjA1MDA1MDg3N30.G7iFlb2vKi1ouABfyI_azLbZ8XGi66tf9kx_dtVIE40'
  );

  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      console.error('❌ Erreur session:', error);
    } else if (session) {
      console.log('✅ Session trouvée:', session.user.email);
      console.log('🔑 User ID:', session.user.id);
      
      // Test récupération messages
      console.log('📡 Test récupération messages...');
      fetch('/api/chat/6001', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      .then(response => {
        console.log('📡 Statut récupération:', response.status);
        return response.text();
      })
      .then(text => {
        console.log('📊 Réponse brute:', text);
        try {
          const data = JSON.parse(text);
          console.log('📊 Messages parsés:', data);
        } catch (e) {
          console.error('❌ Erreur parsing JSON:', e);
        }
      })
      .catch(error => {
        console.error('❌ Erreur récupération:', error);
      });
      
      // Test envoi message
      console.log('📤 Test envoi message...');
      fetch('/api/chat/6001', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          message: 'Test message debug',
          user_id: session.user.id
        })
      })
      .then(response => {
        console.log('📡 Statut envoi:', response.status);
        return response.text();
      })
      .then(text => {
        console.log('📊 Réponse envoi brute:', text);
        try {
          const data = JSON.parse(text);
          console.log('📊 Réponse envoi parsée:', data);
        } catch (e) {
          console.error('❌ Erreur parsing JSON envoi:', e);
        }
      })
      .catch(error => {
        console.error('❌ Erreur envoi:', error);
      });
      
    } else {
      console.error('❌ Aucune session trouvée');
    }
  });
}

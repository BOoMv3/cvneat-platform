// Test simple de l'API
fetch('/api/delivery/preparation-alerts', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token')}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(d => console.log('API Result:', d))
.catch(e => console.error('Error:', e));

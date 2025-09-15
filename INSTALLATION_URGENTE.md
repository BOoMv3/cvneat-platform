# 🚨 INSTALLATION URGENTE - Système de Réclamations

## 📋 Étapes à suivre dans l'ordre

### **ÉTAPE 1 : Exécuter les scripts SQL dans Supabase**

1. **Aller sur Supabase Dashboard**
   - URL : https://supabase.com/dashboard
   - Sélectionner votre projet CVNeat

2. **Ouvrir l'éditeur SQL**
   - Cliquer sur "SQL Editor" dans le menu de gauche
   - Cliquer sur "New Query"

3. **Copier et exécuter le script**
   - Ouvrir le fichier `install-complaints-system.sql`
   - Copier tout le contenu
   - Coller dans l'éditeur SQL
   - Cliquer sur "Run" ou Ctrl+Enter

4. **Vérifier le succès**
   - Vous devriez voir : "Installation terminée avec succès !"
   - Vérifier que les tables sont créées :
     ```sql
     SELECT table_name FROM information_schema.tables 
     WHERE table_name IN ('complaints', 'order_feedback', 'customer_complaint_history', 'complaint_evidence');
     ```

### **ÉTAPE 2 : Créer le bucket de stockage**

**Option A : Script automatique (recommandé)**
```bash
# Installer les dépendances si pas fait
npm install

# Configurer les variables d'environnement
export NEXT_PUBLIC_SUPABASE_URL="votre_url_supabase"
export SUPABASE_SERVICE_ROLE_KEY="votre_service_role_key"

# Exécuter le script
node create-complaint-bucket.js
```

**Option B : Manuel dans Supabase**
1. Aller dans "Storage" dans le dashboard Supabase
2. Cliquer sur "Create Bucket"
3. Nom : `complaint-evidence`
4. Public : **Non** (privé)
5. File size limit : 5MB
6. Allowed MIME types : `image/jpeg,image/png,image/gif,image/webp,application/pdf`

### **ÉTAPE 3 : Configurer un service d'email**

**Option A : SendGrid (recommandé)**
1. Créer un compte sur https://sendgrid.com
2. Générer une API Key
3. Ajouter dans `.env.local` :
   ```env
   SENDGRID_API_KEY=your_sendgrid_api_key
   EMAIL_FROM=noreply@cvneat.com
   ```

**Option B : Mailgun**
1. Créer un compte sur https://mailgun.com
2. Récupérer les credentials
3. Ajouter dans `.env.local` :
   ```env
   MAILGUN_API_KEY=your_mailgun_api_key
   MAILGUN_DOMAIN=your_domain.mailgun.org
   EMAIL_FROM=noreply@cvneat.com
   ```

**Option C : Gmail SMTP (pour les tests)**
```env
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password
```

### **ÉTAPE 4 : Créer un service worker fonctionnel**

Créer le fichier `public/sw.js` :
```javascript
// Service Worker pour les notifications push
const CACHE_NAME = 'cvneat-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker installé');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activé');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.message,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: data.data,
      actions: data.actions || [],
      requireInteraction: false,
      silent: false
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action) {
    // Gérer les actions des notifications
    const data = event.notification.data;
    
    if (event.action === 'feedback' && data.feedback_url) {
      event.waitUntil(clients.openWindow(data.feedback_url));
    } else if (event.action === 'view' && data.order_url) {
      event.waitUntil(clients.openWindow(data.order_url));
    } else if (event.action === 'complaint' && data.complaint_url) {
      event.waitUntil(clients.openWindow(data.complaint_url));
    }
  } else {
    // Clic simple sur la notification
    const data = event.notification.data;
    
    if (data.feedback_url) {
      event.waitUntil(clients.openWindow(data.feedback_url));
    } else if (data.order_url) {
      event.waitUntil(clients.openWindow(data.order_url));
    } else {
      event.waitUntil(clients.openWindow('/'));
    }
  }
});
```

### **ÉTAPE 5 : Configurer Stripe pour les remboursements**

1. **Aller sur Stripe Dashboard**
   - URL : https://dashboard.stripe.com

2. **Créer un webhook**
   - Aller dans "Webhooks"
   - Cliquer "Add endpoint"
   - URL : `https://votre-domaine.com/api/stripe/webhook`
   - Événements à écouter :
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.dispute.created`

3. **Récupérer la clé secrète**
   - Copier la clé secrète du webhook
   - Ajouter dans `.env.local` :
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

### **ÉTAPE 6 : Tester le système complet**

1. **Tester la création de réclamation**
   - Aller sur `/admin/complaints`
   - Vérifier que la page se charge sans erreur

2. **Tester le feedback**
   - Aller sur `/orders/[id]/feedback`
   - Vérifier que le formulaire fonctionne

3. **Tester les notifications**
   - Activer les notifications dans le profil
   - Tester l'envoi d'une notification

4. **Tester l'email**
   - Créer une commande test
   - Vérifier que l'email de livraison est envoyé

## 🔧 Variables d'environnement requises

Ajouter dans `.env.local` :
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@cvneat.com

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Site
NEXT_PUBLIC_SITE_URL=https://votre-domaine.com
```

## ✅ Vérification finale

Après installation, vérifier :
- [ ] Tables créées dans Supabase
- [ ] Bucket de stockage créé
- [ ] Service d'email configuré
- [ ] Service worker fonctionnel
- [ ] Page admin complaints accessible
- [ ] Système de feedback fonctionnel
- [ ] Notifications push actives

## 🆘 En cas de problème

1. **Vérifier les logs** dans Supabase
2. **Vérifier les variables d'environnement**
3. **Tester les APIs individuellement**
4. **Consulter les guides de dépannage**

Une fois ces étapes terminées, le système de réclamations sera **100% fonctionnel** ! 🚀

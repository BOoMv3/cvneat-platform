# Guide de Configuration Stripe pour CVN'EAT

Ce guide vous accompagne étape par étape pour configurer Stripe sur votre plateforme CVN'EAT.

## 📋 Prérequis

- Un compte Stripe (gratuit) : https://stripe.com
- Votre application déployée (ou en local avec ngrok pour les webhooks)

---

## 🔑 Étape 1 : Obtenir vos clés API Stripe

### 1.1 Créer un compte Stripe

1. Allez sur https://stripe.com
2. Cliquez sur "Sign up" (S'inscrire)
3. Remplissez le formulaire d'inscription
4. Vérifiez votre email

### 1.2 Accéder au Dashboard Stripe

1. Connectez-vous à https://dashboard.stripe.com
2. Dans le menu de gauche, cliquez sur **"Developers"** → **"API keys"**

### 1.3 Récupérer vos clés API

**En mode Test (pour le développement) :**
- **Publishable key** : Commence par `pk_test_...`
- **Secret key** : Commence par `sk_test_...` (⚠️ À garder SECRÈTE !)

**En mode Production (quand vous êtes prêt) :**
- **Publishable key** : Commence par `pk_live_...`
- **Secret key** : Commence par `sk_live_...` (⚠️ À garder SECRÈTE !)

---

## 🔧 Étape 2 : Configurer les variables d'environnement

### 2.1 Fichier `.env.local`

Créez ou modifiez le fichier `.env.local` à la racine de votre projet :

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_votre_clé_publishable_ici
STRIPE_SECRET_KEY=sk_test_votre_clé_secrète_ici
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_secret_ici
```

### 2.2 Variables d'environnement sur Vercel (si déployé)

1. Allez sur https://vercel.com
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Environment Variables**
4. Ajoutez les 3 variables :
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

---

## 🔔 Étape 3 : Configurer les Webhooks Stripe

### 3.1 Créer un endpoint webhook

1. Dans le Dashboard Stripe, allez dans **Developers** → **Webhooks**
2. Cliquez sur **"Add endpoint"**
3. **Endpoint URL** : 
   - En production : `https://votre-domaine.com/api/stripe/webhook`
   - En local avec ngrok : `https://votre-url-ngrok.ngrok.io/api/stripe/webhook`
4. Cliquez sur **"Add endpoint"**

### 3.2 Sélectionner les événements à écouter

Dans la page de configuration du webhook, dans la section **"Events to send"**, sélectionnez :

✅ **payment_intent.succeeded**  
✅ **payment_intent.payment_failed**  
✅ **payment_intent.canceled**  
✅ **charge.dispute.created**  
✅ **refund.created**  
✅ **refund.updated**  

Ou sélectionnez **"Select all events"** pour tout activer.

### 3.3 Récupérer le Webhook Secret

1. Après avoir créé le webhook, cliquez dessus
2. Dans la section **"Signing secret"**, cliquez sur **"Reveal"**
3. Copiez le secret (commence par `whsec_...`)
4. Ajoutez-le dans votre `.env.local` comme `STRIPE_WEBHOOK_SECRET`

---

## 🧪 Étape 4 : Tester la configuration

### 4.1 Tester en mode Test

Stripe fournit des cartes de test pour tester les paiements :

**Carte de test acceptée :**
- Numéro : `4242 4242 4242 4242`
- Date : N'importe quelle date future (ex: 12/25)
- CVC : N'importe quel 3 chiffres (ex: 123)
- Code postal : N'importe quel code postal (ex: 12345)

**Carte de test refusée :**
- Numéro : `4000 0000 0000 0002`

### 4.2 Vérifier les logs

1. Dans le Dashboard Stripe, allez dans **Developers** → **Logs**
2. Vous devriez voir les événements de paiement en temps réel

---

## 📝 Étape 5 : Vérifier l'intégration dans le code

### 5.1 Fichiers Stripe dans le projet

Les fichiers suivants utilisent Stripe :

- ✅ `app/api/payment/create-payment-intent/route.js` - Crée les intentions de paiement
- ✅ `app/api/payment/confirm/route.js` - Confirme les paiements
- ✅ `app/api/stripe/webhook/route.js` - Gère les webhooks
- ✅ `app/api/orders/refund/route.js` - Gère les remboursements
- ✅ `components/PaymentForm.js` - Formulaire de paiement

### 5.2 Vérifier que tout est connecté

1. Ouvrez votre application
2. Ajoutez des articles au panier
3. Allez au checkout
4. Essayez un paiement avec la carte de test `4242 4242 4242 4242`

---

## 🚨 Dépannage

### Problème : "Stripe n'est pas initialisé"

**Solution :**
- Vérifiez que `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` est bien défini
- Redémarrez votre serveur de développement après avoir ajouté les variables d'environnement

### Problème : "Erreur lors de la création du paiement"

**Solution :**
- Vérifiez que `STRIPE_SECRET_KEY` est correct
- Vérifiez que vous êtes en mode test avec `sk_test_...` ou en production avec `sk_live_...`
- Vérifiez les logs dans Stripe Dashboard → Developers → Logs

### Problème : "Webhook signature invalide"

**Solution :**
- Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct
- Vérifiez que l'URL du webhook correspond exactement à celle dans Stripe
- Assurez-vous que l'URL est accessible publiquement (utilisez ngrok en local)

### Problème : Les paiements ne sont pas confirmés

**Solution :**
- Vérifiez que le webhook est bien configuré
- Vérifiez que les événements `payment_intent.succeeded` sont sélectionnés
- Vérifiez les logs du webhook dans Stripe Dashboard

---

## 🔄 Passage en Production

### Quand vous êtes prêt pour la production :

1. **Activez votre compte Stripe** :
   - Remplissez les informations de votre entreprise
   - Ajoutez vos informations bancaires

2. **Basculez en mode Live** :
   - Dans Stripe Dashboard, basculez le mode de test vers Live
   - Récupérez vos nouvelles clés Live (commencent par `pk_live_` et `sk_live_`)
   - Mettez à jour vos variables d'environnement

3. **Mettez à jour le webhook** :
   - Créez un nouveau webhook avec l'URL de production
   - Utilisez le nouveau webhook secret

4. **Testez en production** :
   - Faites un petit paiement réel pour tester
   - Vérifiez que tout fonctionne correctement

---

## 📚 Ressources utiles

- **Documentation Stripe** : https://stripe.com/docs
- **Dashboard Stripe** : https://dashboard.stripe.com
- **Stripe Testing** : https://stripe.com/docs/testing
- **Stripe Webhooks** : https://stripe.com/docs/webhooks

---

## ✅ Checklist de configuration

- [ ] Compte Stripe créé
- [ ] Clés API récupérées (Publishable et Secret)
- [ ] Variables d'environnement configurées (`.env.local` et Vercel)
- [ ] Webhook créé et configuré
- [ ] Webhook secret ajouté aux variables d'environnement
- [ ] Événements Stripe sélectionnés dans le webhook
- [ ] Test effectué avec une carte de test
- [ ] Paiement test réussi
- [ ] Webhook reçoit les événements (vérifier dans les logs Stripe)

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans Stripe Dashboard → Developers → Logs
2. Vérifiez la console de votre navigateur (F12)
3. Vérifiez les logs de votre serveur
4. Consultez la documentation Stripe : https://stripe.com/docs


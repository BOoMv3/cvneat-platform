# 📧 Configuration des Notifications Email/WhatsApp

## ⚠️ IMPORTANT
Vous devez **obtenir vos propres clés API** auprès des services. Ne copiez pas les exemples !

---

## 📧 Configuration Email

### Option 1 : Resend (Recommandé - Simple et moderne)

1. **Créer un compte Resend** : https://resend.com
2. **Créer une API Key** :
   - Aller dans **API Keys**
   - Cliquer "Create API Key"
   - Donner un nom : "CVN'EAT Email"
   - Copier la clé (commence par `re_...`)
3. **Ajouter dans `.env.local`** :
   ```env
   RESEND_API_KEY=re_VOTRE_CLE_API_ICI
   EMAIL_FROM=CVN'EAT <noreply@cvneat.fr>
   ```

### Option 2 : SMTP (Gmail, etc.)

1. **Pour Gmail** :
   - Aller dans votre compte Google
   - **Sécurité** → **Validation en 2 étapes** (doit être activée)
   - **Mots de passe des applications** → Créer un mot de passe
   - Copier le mot de passe généré
2. **Ajouter dans `.env.local`** :
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=votre-email@gmail.com
   SMTP_PASS=votre-mot-de-passe-application
   EMAIL_FROM=CVN'EAT <votre-email@gmail.com>
   ```

---

## 📱 Configuration WhatsApp

### Option 1 : Twilio (Recommandé - Simple et fiable)

1. **Créer un compte Twilio** : https://www.twilio.com
2. **Créer un projet WhatsApp** :
   - Aller dans **Messaging** → **Try it out** → **Send a WhatsApp message**
   - Suivre le processus pour activer WhatsApp
   - Obtenir votre numéro WhatsApp (format : `whatsapp:+14155238886`)
3. **Récupérer les credentials** :
   - Dashboard → **Account SID** (commence par `AC...`)
   - Dashboard → **Auth Token**
4. **Ajouter dans `.env.local`** :
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=votre_auth_token_ici
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

### Option 2 : WhatsApp Business API (Meta/Facebook)

1. **Créer une app Facebook** : https://developers.facebook.com
2. **Configurer WhatsApp Business API** :
   - Ajouter le produit WhatsApp
   - Obtenir votre **Phone Number ID**
   - Obtenir votre **Access Token** (temporaire ou permanent)
3. **Ajouter dans `.env.local`** :
   ```env
   WHATSAPP_API_KEY=votre_access_token_ici
   WHATSAPP_PHONE_ID=votre_phone_id_ici
   ```

---

## 📝 Fichier `.env.local` complet

Créez un fichier `.env.local` à la racine du projet avec :

```env
# ========================================
# SUPABASE (déjà configuré normalement)
# ========================================
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role

# ========================================
# EMAIL (CHOISIR UNE OPTION)
# ========================================
# Option 1: Resend (recommandé)
RESEND_API_KEY=re_VOTRE_CLE_ICI
EMAIL_FROM=CVN'EAT <noreply@cvneat.fr>

# Option 2: SMTP (fallback)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=votre-email@gmail.com
# SMTP_PASS=votre-mot-de-passe-app
# EMAIL_FROM=CVN'EAT <votre-email@gmail.com>

# ========================================
# WHATSAPP (CHOISIR UNE OPTION)
# ========================================
# Option 1: Twilio (recommandé)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=votre_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Option 2: WhatsApp Business API (Meta)
# WHATSAPP_API_KEY=votre_access_token
# WHATSAPP_PHONE_ID=votre_phone_id

# ========================================
# STRIPE (déjà configuré normalement)
# ========================================
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# ========================================
# SITE URL
# ========================================
NEXT_PUBLIC_SITE_URL=https://cvneat.fr
```

---

## ✅ Test de la configuration

### Tester l'email :
1. Créer une commande test
2. Vérifier les logs dans la console serveur
3. Vérifier la réception de l'email

### Tester WhatsApp :
1. Créer une commande test
2. Vérifier les logs dans la console serveur
3. Vérifier la réception du message WhatsApp

---

## 🚨 Important pour la production

Sur **Vercel** (ou votre plateforme) :
1. Aller dans **Settings** → **Environment Variables**
2. Ajouter toutes les variables de `.env.local`
3. Redéployer l'application

---

## 💡 Conseils

- **Resend** : Gratuit jusqu'à 3000 emails/mois, très simple à configurer
- **Twilio WhatsApp** : Gratuit pour tester avec un numéro sandbox, payant pour production
- **SMTP Gmail** : Gratuit mais limité à 500 emails/jour
- Pour la production, **Resend + Twilio** est le meilleur choix

---

## 🆘 En cas de problème

1. Vérifier les logs dans la console serveur
2. Vérifier que les clés API sont correctes
3. Vérifier que les services sont activés
4. Tester avec un service à la fois (email d'abord, puis WhatsApp)



# 📧 Guide : Configuration Email pour Newsletter

## 🔍 Vérifier votre configuration actuelle

Le système utilise **nodemailer** avec SMTP. Il peut fonctionner avec plusieurs services :

### Option 1 : SendGrid (Recommandé - Gratuit jusqu'à 100 emails/jour)

**Avantages :**
- Gratuit jusqu'à 100 emails/jour
- Fiable et professionnel
- Facile à configurer

**Comment vérifier si vous avez SendGrid :**
1. Allez sur https://sendgrid.com
2. Connectez-vous avec votre compte
3. Si vous n'avez pas de compte, créez-en un (gratuit)

**Configuration :**
1. Dans SendGrid Dashboard → **Settings > API Keys**
2. Créez une nouvelle API Key avec permission "Mail Send"
3. Copiez la clé (commence par `SG.`)
4. Vérifiez votre domaine ou utilisez l'email vérifié

**Variables d'environnement à ajouter dans Vercel :**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=SG.VOTRE_CLE_API_ICI
EMAIL_FROM=contact@cvneat.fr
```

---

### Option 2 : Gmail (Simple pour commencer)

**Configuration :**
1. Allez sur https://myaccount.google.com/apppasswords
2. Créez un mot de passe d'application pour "Mail"
3. Copiez le mot de passe (16 caractères)

**Variables d'environnement à ajouter dans Vercel :**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=votre-mot-de-passe-application
EMAIL_FROM=contact@cvneat.fr
```

---

### Option 3 : Resend (Moderne et simple)

1. Créez un compte sur https://resend.com
2. Créez une API Key
3. Vérifiez votre domaine `cvneat.fr`

**Variables d'environnement :**
```env
RESEND_API_KEY=re_VOTRE_CLE_ICI
EMAIL_FROM=contact@cvneat.fr
```

---

## ⚠️ Important

Pour que `contact@cvneat.fr` fonctionne, vous devez :
1. **Vérifier le domaine** dans votre service email (SendGrid, Resend, etc.)
2. **Configurer les DNS** de votre domaine pour autoriser l'envoi

---

## 🚀 Configuration rapide (SendGrid)

1. **Créer un compte SendGrid** : https://sendgrid.com (gratuit)
2. **Vérifier votre email** : SendGrid → Settings → Sender Authentication → Single Sender Verification
3. **Ajouter l'email** `contact@cvneat.fr` et vérifier-le
4. **Créer une API Key** : Settings → API Keys → Create API Key
5. **Ajouter dans Vercel** :
   - Allez dans votre projet Vercel
   - Settings → Environment Variables
   - Ajoutez les variables ci-dessus

Une fois configuré, la newsletter fonctionnera automatiquement !


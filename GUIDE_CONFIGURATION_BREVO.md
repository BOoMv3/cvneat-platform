# 📧 Guide : Configuration Brevo pour Newsletter

## ✅ Vous avez Brevo - Configuration rapide

Brevo (anciennement Sendinblue) est un excellent service d'email. Voici comment le configurer :

---

## 🔧 Configuration Brevo

### 1. Récupérer vos identifiants SMTP Brevo

1. **Connectez-vous à Brevo** : https://app.brevo.com
2. Allez dans **Settings** → **SMTP & API**
3. Dans la section **SMTP**, vous verrez :
   - **SMTP Server** : `smtp-relay.brevo.com`
   - **Port** : `587` (TLS) ou `465` (SSL)
   - **Login** : Votre email Brevo (ex: `contact@cvneat.fr`)
   - **Password** : Cliquez sur "Generate SMTP key" pour créer une clé SMTP

### 2. Vérifier votre domaine/email

1. Dans Brevo → **Senders & IP**
2. Ajoutez `contact@cvneat.fr` comme expéditeur
3. Vérifiez-le via l'email reçu

### 3. Configurer dans Vercel

1. Allez sur **Vercel** → Votre projet → **Settings** → **Environment Variables**
2. Ajoutez ces variables :

```env
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=contact@cvneat.fr
EMAIL_PASS=VOTRE_CLE_SMTP_BREVO_ICI
EMAIL_FROM=contact@cvneat.fr
```

### 4. Redéployer

Après avoir ajouté les variables, **redéployez votre projet** sur Vercel pour que les changements prennent effet.

---

## ✅ Test

Une fois configuré, testez la newsletter depuis `/admin/newsletter`. Les emails seront envoyés depuis `contact@cvneat.fr` via Brevo.

---

## 📊 Limites Brevo

- **Plan gratuit** : 300 emails/jour
- **Plan Lite** : 10 000 emails/mois
- Parfait pour la newsletter !

---

## ⚠️ Important

- La clé SMTP Brevo est **différente** de l'API Key
- Utilisez la **clé SMTP** (générée dans SMTP & API)
- Assurez-vous que `contact@cvneat.fr` est vérifié dans Brevo


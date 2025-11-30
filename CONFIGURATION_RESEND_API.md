# 📧 Configuration de la clé API Resend

## Où configurer RESEND_API_KEY

### 1. Sur Vercel (Production)

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet **cvneat-pages**
4. Allez dans **Settings** → **Environment Variables**
5. Cliquez sur **Add New**
6. Ajoutez :
   - **Name:** `RESEND_API_KEY`
   - **Value:** Votre clé API Resend (commence par `re_...`)
   - **Environments:** Production, Preview, Development (cochez tous)
7. Cliquez sur **Save**

### 2. Obtenir une clé API Resend

1. Allez sur [resend.com](https://resend.com)
2. Créez un compte ou connectez-vous
3. Allez dans **API Keys**
4. Cliquez sur **Create API Key**
5. Donnez un nom (ex: "CVN'EAT Production")
6. Copiez la clé (elle commence par `re_...`)
7. ⚠️ **Important:** Vous ne pourrez plus voir la clé après, sauvegardez-la bien !

### 3. Pour le développement local (optionnel)

Créez un fichier `.env.local` à la racine du projet :

```env
RESEND_API_KEY=re_votre_cle_api_ici
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

⚠️ **Ne commitez JAMAIS ce fichier** (il est déjà dans `.gitignore`)

### 4. Vérifier que ça fonctionne

Après avoir configuré la clé :
1. Passez une commande de test
2. Vérifiez les logs dans Vercel (Functions → Logs)
3. Vous devriez voir : `✅ Email envoyé avec succès à: email@example.com`

Si vous voyez `⚠️ RESEND_API_KEY non configurée`, la clé n'est pas correctement configurée.

## 📝 Notes importantes

- La clé API Resend est **gratuite** jusqu'à 3000 emails/mois
- Les emails sont envoyés depuis `noreply@cvneat.fr`
- Tous les emails incluent un lien de désinscription automatique
- Les emails sont conformes RGPD


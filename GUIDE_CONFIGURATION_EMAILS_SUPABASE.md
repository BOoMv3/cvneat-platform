# 📧 Guide de Configuration des Emails de Confirmation Supabase

## 🎯 Problème
Les utilisateurs ne reçoivent pas d'email de confirmation lors de la création de compte.

## ✅ Solution

### Étape 1 : Accéder aux paramètres Email
1. Dans le **Dashboard Supabase**, allez dans **Authentication** (icône bouclier dans la barre latérale)
2. Dans la section **CONFIGURATION** (en bas de la barre latérale), cliquez sur **"Emails"**

### Étape 2 : Activer la confirmation email
1. Dans la page **"Emails"**, trouvez la section **"Confirm signup"**
2. **Activez** l'option **"Enable email confirmations"**
   - Si désactivée, les utilisateurs peuvent se connecter sans confirmer leur email
   - Si activée, les utilisateurs doivent cliquer sur le lien dans l'email pour confirmer leur compte

### Étape 3 : Configurer l'URL de redirection
1. Toujours dans **Authentication > Emails**, trouvez la section **"URL Configuration"** ou **"Redirect URLs"**
2. Assurez-vous que votre URL de callback est autorisée :
   ```
   https://cvneat-platform.vercel.app/auth/callback
   ```
   ou
   ```
   https://votre-domaine.com/auth/callback
   ```

### Étape 4 : Configurer le fournisseur d'email (Optionnel mais recommandé)
Par défaut, Supabase utilise son propre service d'email, mais vous pouvez configurer un service personnalisé :

1. Dans **Authentication > Emails**, trouvez **"SMTP Settings"** ou **"Custom SMTP"**
2. Si vous souhaitez utiliser votre propre service d'email (Gmail, SendGrid, etc.), configurez :
   - **SMTP Host** : ex. `smtp.gmail.com`
   - **SMTP Port** : ex. `587`
   - **SMTP User** : votre adresse email
   - **SMTP Password** : votre mot de passe d'application
   - **Sender Email** : l'adresse email qui enverra les emails

### Étape 5 : Personnaliser les templates d'email (Optionnel)
1. Dans **Authentication > Emails**, trouvez **"Email Templates"**
2. Vous pouvez personnaliser :
   - **Confirm signup** : Template pour l'email de confirmation
   - **Magic Link** : Template pour les liens magiques
   - **Change Email Address** : Template pour le changement d'email
   - **Reset Password** : Template pour la réinitialisation de mot de passe

### Étape 6 : Tester
1. Créez un nouveau compte de test
2. Vérifiez votre boîte de réception (et les spams)
3. Si l'email n'arrive pas :
   - Vérifiez les logs dans **Authentication > Logs**
   - Vérifiez que l'email n'est pas dans les spams
   - Vérifiez que l'adresse email est valide

## 🔍 Vérifications importantes

### Si les emails ne sont toujours pas envoyés :
1. **Vérifiez les logs** : **Authentication > Logs** dans Supabase
2. **Vérifiez les variables d'environnement** :
   - `NEXT_PUBLIC_SITE_URL` doit être défini et correct
   - `NEXT_PUBLIC_SUPABASE_URL` doit être défini
3. **Vérifiez que l'option est activée** : Retournez dans **Authentication > Emails** et confirmez que "Enable email confirmations" est bien activé

### Note importante
Si vous désactivez temporairement la confirmation email pour le développement :
- Les utilisateurs pourront se connecter immédiatement après l'inscription
- Mais cela réduit la sécurité (pas de vérification d'email)

## 📝 Code actuel
Le code dans `app/api/auth/register/route.js` et `app/inscription/page.js` est déjà configuré pour envoyer des emails de confirmation avec `emailRedirectTo`. Il suffit d'activer l'option dans Supabase Dashboard.


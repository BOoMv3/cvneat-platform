# 📧 Guide : Configuration SMTP personnalisé dans Supabase

## 🎯 Problème
Les emails de confirmation ne sont pas reçus malgré l'activation de "Enable email confirmations" dans Supabase.

## ⚠️ Cause probable
Le service d'email intégré de Supabase a des **limites de débit** et n'est pas fiable pour la production. Il faut configurer un **SMTP personnalisé**.

## ✅ Solution : Configurer un SMTP personnalisé

### Option 1 : Gmail (Recommandé pour les tests)

1. **Dans Supabase Dashboard** :
   - Allez dans **Authentication > Emails**
   - Cliquez sur l'onglet **"SMTP Settings"**
   - Cliquez sur **"Set up SMTP"** ou **"Configure custom SMTP"**

2. **Créer un mot de passe d'application Gmail** :
   - Allez sur https://myaccount.google.com/apppasswords
   - Connectez-vous avec votre compte Gmail
   - Sélectionnez "Mail" et "Autre (nom personnalisé)"
   - Entrez "CVN'EAT" comme nom
   - Cliquez sur "Générer"
   - **Copiez le mot de passe généré** (16 caractères)

3. **Configurer dans Supabase** :
   - **Sender email** : `votre-email@gmail.com`
   - **Sender name** : `CVN'EAT`
   - **Host** : `smtp.gmail.com`
   - **Port** : `587`
   - **Username** : `votre-email@gmail.com`
   - **Password** : Le mot de passe d'application généré (16 caractères)
   - **Encryption** : `STARTTLS` ou `TLS`
   - Cliquez sur **"Save"** ou **"Test connection"**

### Option 2 : SendGrid (Recommandé pour la production)

1. **Créer un compte SendGrid** :
   - Allez sur https://sendgrid.com
   - Créez un compte gratuit (100 emails/jour)
   - Vérifiez votre email et votre identité

2. **Créer une API Key** :
   - Dans SendGrid Dashboard, allez dans **Settings > API Keys**
   - Cliquez sur **"Create API Key"**
   - Nom : "CVN'EAT Supabase"
   - Permissions : **"Full Access"** ou **"Mail Send"**
   - **Copiez la clé API** (commence par `SG.`)

3. **Configurer un sender verified** :
   - Dans SendGrid, allez dans **Settings > Sender Authentication**
   - Cliquez sur **"Verify a Single Sender"**
   - Remplissez le formulaire avec votre email
   - Vérifiez l'email reçu

4. **Configurer dans Supabase** :
   - **Sender email** : L'email vérifié dans SendGrid
   - **Sender name** : `CVN'EAT`
   - **Host** : `smtp.sendgrid.net`
   - **Port** : `587`
   - **Username** : `apikey`
   - **Password** : Votre clé API SendGrid (`SG.xxxxx...`)
   - **Encryption** : `STARTTLS`
   - Cliquez sur **"Save"**

### Option 3 : Mailgun (Alternative)

1. **Créer un compte Mailgun** :
   - Allez sur https://www.mailgun.com
   - Créez un compte (offre gratuite disponible)
   - Vérifiez votre domaine

2. **Récupérer les credentials SMTP** :
   - Dans Mailgun Dashboard, allez dans **Sending > Domain Settings**
   - Trouvez votre domaine et cliquez dessus
   - Dans **"SMTP credentials"**, vous verrez :
     - **SMTP hostname** : `smtp.mailgun.org`
     - **Port** : `587` ou `465`
     - **Username** : Votre nom d'utilisateur
     - **Password** : Votre mot de passe SMTP

3. **Configurer dans Supabase** :
   - **Sender email** : `noreply@votre-domaine.com` (ou votre domaine Mailgun)
   - **Sender name** : `CVN'EAT`
   - **Host** : `smtp.mailgun.org`
   - **Port** : `587`
   - **Username** : Votre nom d'utilisateur Mailgun
   - **Password** : Votre mot de passe SMTP Mailgun
   - **Encryption** : `STARTTLS`
   - Cliquez sur **"Save"**

## 🧪 Tester la configuration

1. **Dans Supabase** :
   - Après avoir sauvegardé les paramètres SMTP, cliquez sur **"Test connection"**
   - Vous devriez recevoir un email de test

2. **Tester l'inscription** :
   - Créez un nouveau compte de test sur votre site
   - Vérifiez votre boîte de réception (et les spams)
   - L'email de confirmation devrait arriver

## 📝 Vérifications supplémentaires

### 1. Vérifier l'URL de redirection
- Dans **Authentication > URL Configuration**, vérifiez que :
  - **Site URL** : `https://cvneat-platform.vercel.app`
  - **Redirect URLs** contient : `https://cvneat-platform.vercel.app/auth/callback`

### 2. Vérifier les logs Supabase
- Dans **Authentication > Logs**, vérifiez s'il y a des erreurs d'envoi d'email

### 3. Vérifier les spams
- Les emails peuvent aller dans les spams, vérifiez votre dossier spam

### 4. Vérifier le template d'email
- Dans **Authentication > Emails > Templates > Confirm sign up**
- Assurez-vous que le template contient `{{ .ConfirmationURL }}`

## 🔍 Dépannage

### Si les emails ne sont toujours pas reçus :

1. **Vérifier les logs Supabase** :
   - **Authentication > Logs** dans Supabase Dashboard
   - Cherchez les erreurs liées à l'envoi d'email

2. **Vérifier la configuration SMTP** :
   - Testez à nouveau la connexion SMTP
   - Vérifiez que tous les champs sont corrects

3. **Vérifier les limites du service** :
   - Gmail : 500 emails/jour (gratuit)
   - SendGrid : 100 emails/jour (gratuit)
   - Mailgun : 5000 emails/mois (gratuit)

4. **Vérifier le code** :
   - Assurez-vous que `emailRedirectTo` est bien défini dans le code
   - Vérifiez que `NEXT_PUBLIC_SITE_URL` est correct dans vos variables d'environnement

## 💡 Recommandation

Pour la **production**, utilisez **SendGrid** ou **Mailgun** car :
- Plus fiable que Gmail
- Meilleure délivrabilité
- Statistiques d'envoi
- API pour gérer les emails

Pour les **tests**, **Gmail** est suffisant.


# 📧 Guide : Où activer les emails de confirmation dans Supabase

## 🎯 Localisation dans Supabase Dashboard

Vous êtes déjà dans la bonne section ! Voici où trouver l'option pour activer les emails :

### Étape 1 : Aller dans Authentication > Settings
1. Dans le **Dashboard Supabase**, vous êtes actuellement dans **Authentication > Emails** (Templates)
2. Dans la barre latérale gauche, sous **"CONFIGURATION"**, cliquez sur **"Settings"** (ou **"URL Configuration"** puis revenez)
3. Ou cherchez directement dans la barre latérale : **Authentication > Settings**

### Étape 2 : Activer "Enable email confirmations"
1. Dans la page **"Settings"** ou **"Authentication Settings"**, vous devriez voir une section **"Email Auth"** ou **"User Signups"**
2. Trouvez l'option : **"Enable email confirmations"** (ou **"Confirm email"**)
3. **Activez** cette option (basculez le switch sur "ON")
4. **Sauvegardez** les changements

### Étape 3 : Configurer l'URL de redirection
Toujours dans **Settings**, vérifiez que l'URL de redirection est correcte :
- **Site URL** : `https://cvneat-platform.vercel.app` (ou votre domaine)
- **Redirect URLs** : Assurez-vous que `https://cvneat-platform.vercel.app/auth/callback` est dans la liste

### Alternative : Si vous ne trouvez pas "Settings"
1. Dans **Authentication**, cherchez **"URL Configuration"**
2. Activez **"Enable email confirmations"** dans cette section
3. Ou cherchez dans **"Advanced"** sous **CONFIGURATION**

## 📝 Note importante

**Le template d'email est déjà configuré** (vous l'avez vu dans "Templates" > "Confirm sign up"). Il suffit maintenant d'activer l'envoi des emails dans les paramètres.

## ⚠️ Si les emails ne sont toujours pas envoyés

1. **Vérifiez les logs** : **Authentication > Logs** dans Supabase Dashboard
2. **Configurer un SMTP personnalisé** :
   - Dans **Authentication > Emails**, cliquez sur l'onglet **"SMTP Settings"**
   - Configurez un service SMTP (Gmail, SendGrid, etc.)
   - Le service intégré de Supabase a des limites de débit

## 🔍 Vérification dans le code

Le code est déjà configuré pour envoyer des emails :
- `emailRedirectTo` est défini dans `app/api/auth/register/route.js`
- `app/auth/callback/page.js` gère la redirection après confirmation

Il ne reste qu'à activer l'option dans Supabase Dashboard !


# Connexion iOS et email de confirmation

## 1. Connexion qui échoue sur l'app iOS (« email ou mot de passe incorrect »)

Si un utilisateur se connecte au **site web** mais pas à l’app iOS avec les mêmes identifiants, causes possibles :

- **Email en majuscules** : Supabase stocke les emails en minuscules. Si l’utilisateur saisit `Jean@Gmail.com` dans l’app, la connexion peut échouer.  
  → Le formulaire de login normalise déjà l’email en minuscules, mais vérifier que l’app iOS utilise bien cette normalisation.

- **Cache / keychain iOS** : anciennes données de session ou mots de passe incorrects dans le keychain.  
  → Demander à l’utilisateur de : supprimer l’app, la réinstaller, puis se reconnecter. Ou de réinitialiser son mot de passe via « Mot de passe oublié ».

- **API et domaine** : en app Capacitor, les requêtes sont redirigées vers `https://www.cvneat.fr`. Si le serveur ou la config Supabase change, les erreurs peuvent différer entre web et app.  
  → Vérifier que `www.cvneat.fr` pointe bien vers le bon backend et que Supabase est correctement configuré.

## 2. Email de confirmation supprimé

L’inscription passe maintenant par `/api/auth/register`, qui utilise `auth.admin.createUser` avec `email_confirm: true`.  
Aucun email de confirmation n’est envoyé, le compte est confirmé dès la création.

Pour être sûr que Supabase n’envoie plus d’emails de confirmation :

1. Ouvrir **Supabase Dashboard** → **Authentication** → **Providers** → **Email**
2. Vérifier **Confirm email** : si activé, le désactiver pour ne plus exiger de confirmation par email.

## 3. Réinitialisation du mot de passe

La page **« Mot de passe oublié »** (`/auth/forgot-password`) est visible sur la page de connexion. L'utilisateur entre son email et reçoit un lien par email pour définir un nouveau mot de passe.

**Config Supabase requise** : Dans **Supabase Dashboard** → **Authentication** → **URL Configuration** → **Redirect URLs**, ajouter :
- `https://www.cvneat.fr/auth/update-password`
- `https://cvneat.fr/auth/update-password` (si redirection)

Sans ces URLs, le lien de réinitialisation envoyé par email ne fonctionnera pas.

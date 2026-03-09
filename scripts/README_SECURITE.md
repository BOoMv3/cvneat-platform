# 🔒 Sécurité - Scripts de création de restaurants

## ⚠️ IMPORTANT : Ne jamais commiter les mots de passe dans le code !

Les scripts de création de restaurants ont été modifiés pour ne plus contenir de mots de passe en dur. Utilisez des variables d'environnement ou des arguments en ligne de commande pour les identifiants.

## 📝 Utilisation sécurisée

### Option 1 : Variables d'environnement (Recommandé)

Créez un fichier `.env.local` (déjà dans `.gitignore`) et définissez les variables nécessaires au script (email, mot de passe, etc.). Puis exécutez le script concerné.

### Option 2 : Arguments en ligne de commande

Passez les identifiants en arguments selon la documentation du script (sans les commiter).

## 🔐 Actions à prendre immédiatement

Si un mot de passe a été exposé sur GitHub :

1. **Changez le mot de passe immédiatement** dans Supabase Auth
2. **Révoquez l'ancien secret** via GitGuardian
3. **Vérifiez l'historique Git** pour d'autres expositions
4. **Utilisez des mots de passe forts** et uniques

## 🛡️ Bonnes pratiques

- ✅ Utiliser des variables d'environnement
- ✅ Ne jamais commiter les fichiers `.env.local`
- ✅ Utiliser des mots de passe forts (min. 12 caractères, majuscules, minuscules, chiffres, symboles)
- ✅ Changer les mots de passe régulièrement
- ✅ Utiliser un gestionnaire de mots de passe

## 📚 Documentation

Pour plus d'informations sur la sécurité :
- [GitGuardian Documentation](https://docs.gitguardian.com/)
- [OWASP Password Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)


# 🔒 Sécurité - Scripts de création de restaurants

## ⚠️ IMPORTANT : Ne jamais commiter les mots de passe dans le code !

Les scripts de création de restaurants (`create-molokai.js`, `create-otoasty.js`) ont été modifiés pour ne plus contenir de mots de passe en dur.

## 📝 Utilisation sécurisée

### Option 1 : Variables d'environnement (Recommandé)

Créez un fichier `.env.local` (déjà dans `.gitignore`) :

```bash
# .env.local
MOLOKAI_EMAIL=molokai@cvneat.fr
MOLOKAI_PASSWORD=votre_mot_de_passe_securise
OTOASTY_EMAIL=otoasty@cvneat.fr
OTOASTY_PASSWORD=votre_mot_de_passe_securise
```

Puis exécutez :
```bash
node scripts/create-molokai.js
```

### Option 2 : Arguments en ligne de commande

```bash
node scripts/create-molokai.js molokai@cvneat.fr votre_mot_de_passe_securise
```

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


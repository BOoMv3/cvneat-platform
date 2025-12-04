# 🔐 Installation de CocoaPods - Guide Sécurisé

## ✅ C'est NORMAL qu'on vous demande un mot de passe !

Quand vous tapez `sudo gem install cocoapods`, macOS vous demande votre mot de passe administrateur. **C'est tout à fait normal et sécurisé.**

---

## 📝 Pourquoi un mot de passe ?

CocoaPods doit être installé **globalement** sur votre Mac pour être accessible dans tous vos projets iOS. L'installation nécessite des **privilèges administrateur**, d'où la demande de mot de passe.

**C'est la même chose que :**
- Installer une application depuis l'App Store (première fois)
- Mettre à jour macOS
- Installer certains logiciels

---

## 🔒 Sécurité

- ✅ **C'est votre mot de passe Mac** (celui que vous utilisez pour vous connecter)
- ✅ **C'est local** : rien n'est envoyé sur internet
- ✅ **C'est temporaire** : la permission dure seulement le temps de l'installation
- ✅ **C'est standard** : tous les développeurs iOS font cette étape

---

## 🚀 Comment procéder

### Étape 1 : Ouvrir votre Terminal

Assurez-vous d'être dans le dossier du projet :
```bash
cd /Users/boomv3/Desktop/cvneat-platform
```

### Étape 2 : Lancer la commande

```bash
sudo gem install cocoapods
```

### Étape 3 : Entrer votre mot de passe

1. Vous verrez : `Password:` ou `Mot de passe:`
2. **Tapez votre mot de passe de session Mac** (celui pour vous connecter)
   - ⚠️ **Le mot de passe ne s'affiche pas** pendant que vous tapez (c'est normal !)
   - ⚠️ **Tapez-le quand même** puis appuyez sur Entrée
3. L'installation commence (2-5 minutes)

---

## ✅ Vérifier que ça a fonctionné

Une fois l'installation terminée, vérifiez :

```bash
pod --version
```

Vous devriez voir un numéro de version (ex: `1.15.2`)

---

## 🆘 Problèmes courants

### "Password:" mais rien ne s'affiche quand je tape

**C'est normal !** macOS cache le mot de passe pour la sécurité. Tapez-le quand même puis appuyez sur Entrée.

### "Sorry, try again"

Le mot de passe est incorrect. Réessayez avec votre mot de passe de session Mac.

### "command not found: sudo"

Vous êtes peut-être sur un compte utilisateur standard. Contactez l'administrateur de votre Mac.

---

## 🔄 Alternative : Installation sans sudo (avancé)

Si vous préférez éviter sudo (plus complexe), vous pouvez installer CocoaPods dans votre répertoire utilisateur, mais c'est **déconseillé** car plus compliqué à maintenir.

---

## 📊 Après l'installation

Une fois CocoaPods installé, vous pourrez :

1. ✅ Installer les Pods iOS : `./scripts/install-pods.sh`
2. ✅ Ouvrir dans Xcode : `npm run capacitor:open:ios`
3. ✅ Tester votre application !

---

## 🎯 Résumé

1. **C'est normal** qu'on demande un mot de passe
2. **C'est sécurisé** (votre mot de passe local)
3. **Tapez votre mot de passe Mac** (il ne s'affiche pas, c'est normal)
4. **Une fois fait, c'est terminé** (installation en 2-5 minutes)

**Pas de souci, allez-y ! 👍**

---

**Besoin d'aide ?** Consultez `GUIDE_RAPIDE_IOS.md` pour la suite.


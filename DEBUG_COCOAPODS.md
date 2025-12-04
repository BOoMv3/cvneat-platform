# 🔍 Vérification de l'Installation CocoaPods

## ⚠️ Important : Le mot de passe ne s'affiche PAS !

Quand vous tapez votre mot de passe après `sudo gem install cocoapods`, **RIEN ne s'affiche à l'écran**. C'est une mesure de sécurité macOS.

**C'est normal !** Continuez comme si tout fonctionnait.

---

## 📝 Instructions étape par étape

### 1. Dans votre terminal, tapez :

```bash
sudo gem install cocoapods
```

### 2. Appuyez sur **Entrée**

Vous verrez : `Password:` ou `[sudo] password for votre_nom:`

### 3. **IMPORTANT** : Tapez votre mot de passe

- **RIEN ne s'affichera** pendant que vous tapez
- **C'est normal !** macOS cache le mot de passe pour la sécurité
- Tapez-le quand même, caractère par caractère

### 4. Appuyez sur **Entrée** une fois le mot de passe tapé

**Même si rien ne s'affiche, tapez votre mot de passe puis appuyez sur Entrée !**

### 5. Attendez

L'installation commence. Vous verrez des messages comme :
```
Fetching cocoapods-core...
Installing cocoapods (1.15.2)
Successfully installed cocoapods
```

**Durée : 2-5 minutes**

---

## ✅ Vérifier si l'installation a fonctionné

Après quelques minutes, dans un **nouveau terminal**, tapez :

```bash
pod --version
```

**Si vous voyez un numéro** (ex: `1.15.2`), c'est installé ! ✅

**Si vous voyez** `command not found: pod`, l'installation n'a pas fonctionné.

---

## 🔄 Si rien ne se passe après le mot de passe

### Option 1 : Réessayer

1. Fermez le terminal actuel
2. Ouvrez un nouveau terminal
3. Réessayez :

```bash
sudo gem install cocoapods
```

### Option 2 : Vérifier votre mot de passe

Assurez-vous d'utiliser le **même mot de passe** que celui de votre compte utilisateur Mac (celui pour vous connecter au Mac).

### Option 3 : Vérifier les permissions

Vérifiez que votre compte a les permissions administrateur :

```bash
groups
```

Vous devriez voir `admin` ou `wheel` dans la liste.

---

## 🆘 Si l'installation échoue

### Erreur : "Sorry, try again"

Le mot de passe était incorrect. Réessayez.

### Erreur : "command not found: gem"

Ruby n'est pas installé. Installez-le :

```bash
xcode-select --install
```

### Erreur : Permission denied

Votre compte n'a peut-être pas les droits administrateur. Contactez l'administrateur de votre Mac.

---

## 🎯 Résumé

1. **Tapez** `sudo gem install cocoapods`
2. **Appuyez** sur Entrée
3. **Tapez** votre mot de passe (rien ne s'affiche, c'est normal)
4. **Appuyez** sur Entrée
5. **Attendez** 2-5 minutes
6. **Vérifiez** avec `pod --version`

**Le mot de passe ne s'affiche JAMAIS - c'est la sécurité macOS !** 👍


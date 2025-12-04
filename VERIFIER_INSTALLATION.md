# ✅ Vérification de l'Installation CocoaPods

## 🔍 Comment vérifier si CocoaPods est installé

### Méthode 1 : Dans un NOUVEAU terminal

**Important :** Fermez votre terminal actuel et ouvrez-en un nouveau, puis tapez :

```bash
pod --version
```

**Si vous voyez un numéro** (ex: `1.15.2`) → ✅ CocoaPods est installé !

**Si vous voyez** `command not found: pod` → ❌ Pas encore installé

---

### Méthode 2 : Vérifier via gem

```bash
gem list cocoapods
```

Si vous voyez une liste avec `cocoapods`, c'est installé.

---

## 🔄 Si CocoaPods n'est pas encore détecté

### Option 1 : L'installation est peut-être encore en cours

Si vous venez de lancer l'installation, attendez 2-5 minutes et réessayez.

### Option 2 : Redémarrer le terminal

CocoaPods peut être installé mais pas encore dans votre PATH. Fermez et rouvrez votre terminal, puis :

```bash
pod --version
```

### Option 3 : Réinstaller

Si ça ne fonctionne toujours pas, réessayez :

```bash
sudo gem install cocoapods
```

---

## 🎯 Une fois CocoaPods installé

Quand `pod --version` affiche un numéro, vous pouvez continuer :

```bash
# Installer les Pods iOS
./scripts/install-pods.sh

# Ou manuellement
cd ios/App
pod install
cd ../..
```

---

## 📝 Résumé

1. **Ouvrez un NOUVEAU terminal**
2. **Tapez** : `pod --version`
3. **Si vous voyez un numéro** → ✅ C'est installé, continuez !
4. **Si erreur** → ❌ Réessayez l'installation

---

**Testez maintenant dans un nouveau terminal !**


# 🔧 Solution : Ruby Trop Ancien (2.6.10)

## ❌ Problème

Votre version de Ruby est **2.6.10**, mais CocoaPods nécessite **Ruby >= 3.1.0**.

```
ERROR: securerandom requires Ruby version >= 3.1.0. 
The current ruby version is 2.6.10.210.
```

---

## ✅ Solution : Mettre à Jour Ruby

**Bonne nouvelle :** Vous avez Homebrew installé ! C'est parfait. 🎉

### Option 1 : Script Automatique (Recommandé) 🚀

J'ai créé un script qui fait tout automatiquement :

```bash
./scripts/installer-ruby-et-cocoapods.sh
```

**Cela va :**
1. Installer Ruby 3.3.0 via Homebrew
2. Ajouter Ruby au PATH
3. Installer CocoaPods
4. Tout configurer automatiquement

**Durée :** 10-15 minutes (installation de Ruby)

---

### Option 2 : Installation Manuelle

#### Étape 1 : Installer Ruby via Homebrew

```bash
brew install ruby
```

**Durée :** 5-10 minutes

#### Étape 2 : Ajouter Ruby au PATH

```bash
echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### Étape 3 : Vérifier la nouvelle version

```bash
ruby --version
```

Vous devriez voir **Ruby 3.3.x** ou supérieur.

#### Étape 4 : Installer CocoaPods

```bash
sudo gem install cocoapods
```

#### Étape 5 : Vérifier CocoaPods

```bash
pod --version
```

---

## ⚠️ Important

Après avoir ajouté Ruby au PATH :

1. **Fermez et rouvrez votre terminal** pour que les changements prennent effet
2. Ou tapez : `source ~/.zshrc`

---

## 🔍 Vérifications

Après l'installation, vérifiez :

```bash
# Version Ruby (doit être >= 3.1.0)
ruby --version

# Version CocoaPods
pod --version
```

---

## 🎯 Recommandation

**Utilisez le script automatique** - c'est le plus simple :

```bash
./scripts/installer-ruby-et-cocoapods.sh
```

Puis **fermez et rouvrez votre terminal**, et testez :

```bash
ruby --version
pod --version
```

---

## 📝 Résumé

1. **Ruby 2.6.10** → Trop ancien ❌
2. **Installer Ruby 3.3.0** via Homebrew ✅
3. **Ajouter au PATH** ✅
4. **Installer CocoaPods** ✅
5. **Vérifier** avec `pod --version` ✅

**Prêt à lancer le script ?** 🚀


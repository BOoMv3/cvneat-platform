# 🔧 Solution : Version Ruby Trop Ancienne

## ❌ Problème Identifié

Votre version de Ruby est **2.6.10**, mais CocoaPods nécessite **Ruby >= 3.1.0**.

```
ERROR: securerandom requires Ruby version >= 3.1.0. 
The current ruby version is 2.6.10.210.
```

---

## ✅ Solution : Mettre à Jour Ruby

### Option 1 : Utiliser Homebrew (Recommandé) 🎯

C'est la méthode la plus simple et la plus propre.

#### Étape 1 : Installer Homebrew (si pas déjà installé)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Étape 2 : Installer Ruby via Homebrew

```bash
brew install ruby
```

#### Étape 3 : Ajouter Ruby au PATH

Ajoutez cette ligne à votre fichier `~/.zshrc` ou `~/.bash_profile` :

```bash
echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
```

Puis rechargez :

```bash
source ~/.zshrc
```

#### Étape 4 : Vérifier la nouvelle version

```bash
ruby --version
```

Vous devriez voir Ruby 3.x.x

#### Étape 5 : Installer CocoaPods

```bash
sudo gem install cocoapods
```

---

### Option 2 : Utiliser rbenv (Gestionnaire de versions Ruby)

#### Étape 1 : Installer rbenv via Homebrew

```bash
brew install rbenv ruby-build
```

#### Étape 2 : Initialiser rbenv

```bash
echo 'eval "$(rbenv init - zsh)"' >> ~/.zshrc
source ~/.zshrc
```

#### Étape 3 : Installer Ruby 3.3.0

```bash
rbenv install 3.3.0
rbenv global 3.3.0
```

#### Étape 4 : Vérifier

```bash
ruby --version
```

#### Étape 5 : Installer CocoaPods

```bash
gem install cocoapods
```

---

### Option 3 : Installer une Version Ancienne de CocoaPods Compatible

**Note :** Ce n'est pas recommandé, mais ça peut fonctionner temporairement.

```bash
sudo gem install cocoapods -v 1.11.3
```

Mais **je recommande fortement** de mettre à jour Ruby plutôt que d'utiliser une ancienne version.

---

## 🚀 Méthode Rapide Recommandée

Si vous avez déjà Homebrew :

```bash
# 1. Installer Ruby
brew install ruby

# 2. Ajouter au PATH
echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 3. Vérifier
ruby --version

# 4. Installer CocoaPods
sudo gem install cocoapods

# 5. Vérifier CocoaPods
pod --version
```

---

## 📝 Vérifications

Après la mise à jour de Ruby, vérifiez :

```bash
# Version Ruby (doit être >= 3.1.0)
ruby --version

# Version CocoaPods
pod --version
```

---

## ⚠️ Important

- **Fermez et rouvrez votre terminal** après avoir modifié le PATH
- La mise à jour de Ruby peut prendre 5-10 minutes
- Homebrew est l'outil standard sur macOS pour installer des logiciels

---

**Recommandation :** Utilisez l'**Option 1 (Homebrew)** - c'est la plus simple ! 🎯


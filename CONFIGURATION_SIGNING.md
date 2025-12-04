# 🔐 Configuration du Signing iOS

## 📱 Quel Compte Utiliser ?

### Pour le Signing dans Xcode

**Utilisez le compte Apple ID de votre Mac** (celui avec lequel vous êtes connecté à Xcode).

---

## 🎯 Étapes de Configuration

### 1. Dans Xcode

1. Cliquez sur l'onglet **"Signing & Capabilities"**
2. Cochez **"Automatically manage signing"**
3. Dans le menu déroulant **"Team"**, sélectionnez :
   - Votre compte Apple ID (celui de votre Mac)
   - Si vous ne le voyez pas : Cliquez sur **"Add Account..."**
   - Connectez-vous avec votre Apple ID du Mac

---

## 📱 Tester sur votre iPhone

### Option 1 : Utiliser le même compte (Recommandé)

Si vous voulez tester sur votre iPhone physique :

1. **Sur votre iPhone :**
   - Allez dans **Settings** → **General** → **VPN & Device Management**
   - Trouvez le profil de développeur avec votre compte Apple ID du Mac
   - Appuyez sur **"Trust"**

2. **Dans Xcode :**
   - Connectez votre iPhone via USB
   - Sélectionnez votre iPhone dans la liste des appareils (en haut)
   - Cliquez sur **▶️ Play**

**Note :** Avec un compte gratuit, l'app fonctionnera pendant **7 jours** sur votre iPhone.

---

### Option 2 : Tester uniquement sur le Simulateur

Si vous préférez ne pas configurer votre iPhone :

1. **Dans Xcode :**
   - Sélectionnez un **simulateur iOS** (ex: "iPhone 15 Pro")
   - Cliquez sur **▶️ Play**

**Avantage :** Pas besoin de configurer votre iPhone, fonctionne immédiatement.

---

## ⚠️ Important

- **Le compte pour le Signing** = Compte Apple ID de votre Mac
- **Pour tester sur iPhone** = Le même compte (ou configurer l'iPhone avec ce compte)
- **Compte gratuit** = Permet de tester pendant 7 jours
- **Compte payant ($99/an)** = Pour publier sur l'App Store

---

## 🔍 Vérifier votre Compte dans Xcode

1. **Xcode** → **Settings** (ou **Preferences**)
2. Onglet **"Accounts"**
3. Vous verrez votre compte Apple ID listé

C'est ce compte que vous devez utiliser pour le Signing.

---

## 📝 Résumé

**Pour le Signing :**
- Utilisez le **compte Apple ID de votre Mac**
- C'est celui qui apparaît dans Xcode → Settings → Accounts

**Pour tester :**
- **Simulateur** : Fonctionne directement avec n'importe quel compte
- **iPhone physique** : Doit être configuré avec le même compte (ou faire confiance au développeur)

---

**Configurez le Signing avec votre compte Mac, puis testez sur le simulateur d'abord !** 🚀


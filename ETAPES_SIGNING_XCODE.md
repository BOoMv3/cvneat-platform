# 📱 Étapes pour Configurer le Signing dans Xcode

## 🎯 Objectif

Configurer le Signing pour pouvoir lancer l'application iOS.

---

## 📋 Étapes Détaillées

### Étape 1 : Aller dans "Signing & Capabilities"

1. **Dans Xcode**, regardez les **onglets en haut** :
   - General
   - **Signing & Capabilities** ← Cliquez ici
   - Resource Tags
   - Info
   - Build Settings
   - Build Phases
   - Build Rules

2. **Cliquez sur l'onglet "Signing & Capabilities"**

---

### Étape 2 : Configurer le Signing

Une fois dans "Signing & Capabilities", vous verrez une section **"Signing"** :

1. **Cochez la case** "Automatically manage signing"
   - Cette case doit être ✅ cochée

2. **Dans le menu déroulant "Team"** :
   - Cliquez sur le menu déroulant
   - **Sélectionnez votre compte Apple ID** (celui que vous avez vérifié)
   - Si vous ne voyez pas votre compte :
     - Cliquez sur **"Add Account..."**
     - Connectez-vous avec votre Apple ID
     - Votre compte apparaîtra dans la liste

---

### Étape 3 : Vérifier que ça fonctionne

Après avoir sélectionné votre Team, Xcode devrait :

- ✅ Afficher un message de succès
- ✅ Générer automatiquement un "Provisioning Profile"
- ✅ Afficher "Signing Certificate" avec votre nom

**Si vous voyez une erreur** (rouge) :
- Vérifiez que votre email Apple ID est bien vérifié
- Réessayez de sélectionner votre Team

---

### Étape 4 : Sélectionner un Simulateur

1. **En haut de Xcode**, à côté de "App > main", il y a un menu déroulant
2. **Cliquez dessus** et sélectionnez :
   - **"iPhone 15 Pro"** (ou un autre simulateur)
   - Ou **"Any iOS Device"** si vous voulez tester sur votre iPhone

---

### Étape 5 : Lancer l'Application ! 🚀

1. **Cliquez sur le bouton ▶️ Play** (en haut à gauche de Xcode)
   - Ou appuyez sur **`Cmd + R`**

2. **Attendez** que Xcode compile et lance l'application
   - Première fois : 2-5 minutes
   - Les fois suivantes : 30 secondes - 2 minutes

3. **Le simulateur iOS s'ouvrira** et votre application se lancera ! 🎉

---

## ✅ Vérifications

Avant de lancer, vérifiez que :

- ✅ "Automatically manage signing" est coché
- ✅ Votre Team est sélectionné dans le menu déroulant
- ✅ Aucune erreur rouge n'apparaît
- ✅ Un simulateur iOS est sélectionné

---

## 🆘 Si vous avez une Erreur

### Erreur : "No signing certificate found"

- Votre compte n'est pas configuré correctement
- Réessayez de sélectionner votre Team

### Erreur : "Provisioning profile not found"

- Xcode va le créer automatiquement
- Attendez quelques secondes

### Erreur : "Bundle identifier already exists"

- Changez le Bundle Identifier dans "General" → "Identity"
- Par exemple : `fr.cvneat.app.dev`

---

## 🎯 Résumé Rapide

1. **Onglet "Signing & Capabilities"**
2. **Cocher "Automatically manage signing"**
3. **Sélectionner votre Team** (votre compte Apple ID)
4. **Sélectionner un simulateur** (iPhone 15 Pro)
5. **Cliquer sur ▶️ Play**

**C'est tout !** 🎉


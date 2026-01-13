# 📱 Guide : Configuration Push Notifications dans Xcode

## 🎯 Objectif

Configurer Xcode pour que les notifications push fonctionnent dans l'app iOS.

## 📋 Prérequis

- ✅ Compte Apple Developer payant (99€/an)
- ✅ Clé APNs créée (déjà fait ✅)
- ✅ Xcode installé sur votre Mac

---

## 🚀 Étape 1 : Ouvrir le Projet iOS dans Xcode

1. **Ouvrir le terminal** (si pas déjà ouvert)

2. **Aller dans le dossier du projet** :
   ```bash
   cd /Users/boomv3/Desktop/cvneat-platform
   ```

3. **Ouvrir le projet iOS** :
   ```bash
   npx cap open ios
   ```

4. **Attendre** que Xcode s'ouvre (peut prendre 1-2 minutes la première fois)

---

## 🔍 Étape 2 : Vérifier le Bundle Identifier

1. **Dans Xcode**, dans le navigateur de gauche, **sélectionner** le projet **"App"** (icône bleue en haut)

2. **Dans la fenêtre principale**, vous verrez plusieurs onglets en haut :
   - General
   - Signing & Capabilities ← **Cliquer ici**
   - Info
   - Build Settings
   - etc.

3. **Cliquer sur** **"Signing & Capabilities"**

4. **Vérifier** que le **Bundle Identifier** est bien : `fr.cvneat.app`
   - Il doit correspondre **exactement** à celui configuré dans Apple Developer
   - Si différent, **modifier** pour mettre `fr.cvneat.app`

---

## ✅ Étape 3 : Ajouter Push Notifications

1. **Toujours dans** "Signing & Capabilities"

2. **Regarder** la section "Capabilities" (en bas de la fenêtre)

3. **Vérifier** si **"Push Notifications"** est déjà dans la liste

### Si "Push Notifications" est DÉJÀ présent ✅

- **C'est bon !** Passez à l'étape 4

### Si "Push Notifications" est ABSENT ❌

1. **Cliquer sur** le bouton **"+ Capability"** (en haut à gauche de la section Capabilities)

2. **Dans la liste qui s'affiche**, chercher **"Push Notifications"**

3. **Double-cliquer** sur **"Push Notifications"** (ou cliquer puis "Add")

4. **Vérifier** que "Push Notifications" apparaît maintenant dans la liste des Capabilities

---

## 🔐 Étape 4 : Vérifier le Signing (Certificat)

1. **Toujours dans** "Signing & Capabilities"

2. **Section "Signing"** (en haut) :

   **Team** :
   - **Sélectionner** votre équipe Apple Developer
   - Si vous ne voyez pas votre équipe :
     - Cliquer sur "Add Account..."
     - Se connecter avec votre Apple ID
     - Sélectionner votre équipe

   **Provisioning Profile** :
   - Devrait être automatiquement généré
   - Si erreur, cliquer sur "Download Manual Profiles"

   **Bundle Identifier** :
   - Doit être `fr.cvneat.app`
   - Si différent, modifier

---

## 🏗️ Étape 5 : Builder l'Application

1. **Dans Xcode**, en haut à gauche, **sélectionner** :
   - **Device** : Votre iPhone physique (pas "iPhone Simulator")
   - ⚠️ **IMPORTANT** : Les notifications ne fonctionnent PAS sur simulateur

2. **Si votre iPhone n'apparaît pas** :
   - Connecter votre iPhone au Mac avec un câble USB
   - Déverrouiller l'iPhone
   - Accepter "Faire confiance à cet ordinateur" sur l'iPhone
   - Attendre que Xcode détecte l'iPhone

3. **Cliquer sur** le bouton **"Run"** (▶️) en haut à gauche
   - OU appuyer sur `Cmd + R`

4. **Attendre** que l'app se compile et s'installe (2-5 minutes la première fois)

5. **Sur votre iPhone** :
   - Si demandé, aller dans **Settings → General → VPN & Device Management**
   - Faire confiance au développeur
   - L'app devrait s'ouvrir automatiquement

---

## 🧪 Étape 6 : Tester les Notifications

### Test 1 : Vérifier que l'app enregistre le token

1. **Ouvrir l'app** sur votre iPhone

2. **Se connecter** (livreur ou restaurant)

3. **Regarder les logs Xcode** :
   - Dans Xcode, en bas, ouvrir la **Console** (ou `Cmd + Shift + Y`)
   - Chercher les messages :
     - `📱 Enregistrement token ios: ...`
     - `✅ Token enregistré avec succès`

### Test 2 : Envoyer une notification

1. **Créer une commande** depuis le site web (ou un autre appareil)

2. **Vérifier** que la notification arrive sur l'iPhone

3. **Vérifier les logs Xcode** :
   - Chercher : `✅ Notification APNs envoyée avec succès`

---

## 🐛 Problèmes Courants

### "No devices found"

**Solution** :
- Connecter l'iPhone au Mac avec un câble USB
- Déverrouiller l'iPhone
- Accepter "Faire confiance à cet ordinateur"

### "Signing for App requires a development team"

**Solution** :
- Dans "Signing & Capabilities", sélectionner votre Team
- Si pas de Team, cliquer sur "Add Account..." et se connecter

### "Push Notifications capability requires a valid provisioning profile"

**Solution** :
- Cliquer sur "Download Manual Profiles"
- Ou modifier le Bundle Identifier pour qu'il corresponde à celui dans Apple Developer

### "The app won't install on my iPhone"

**Solution** :
- Sur l'iPhone : Settings → General → VPN & Device Management
- Faire confiance au développeur
- Réessayer d'installer

### "Les notifications ne fonctionnent pas"

**Vérifier** :
1. L'app est installée sur un iPhone physique (pas simulateur)
2. Push Notifications est dans les Capabilities
3. Les permissions sont accordées (Settings → CVN'EAT → Notifications)
4. L'app a été lancée au moins une fois après installation

---

## ✅ Checklist

- [ ] Xcode est ouvert avec le projet iOS
- [ ] Bundle Identifier = `fr.cvneat.app`
- [ ] Push Notifications est dans les Capabilities
- [ ] Team est sélectionné dans Signing
- [ ] iPhone physique est sélectionné (pas simulateur)
- [ ] L'app est compilée et installée sur l'iPhone
- [ ] L'app s'ouvre sur l'iPhone
- [ ] Les permissions notifications sont accordées

---

## 🎯 Prochaine Étape

Une fois Xcode configuré et l'app installée, vous pouvez **tester les notifications** en créant une commande depuis le site web.

**Besoin d'aide ?** Dites-moi à quelle étape vous êtes bloqué !


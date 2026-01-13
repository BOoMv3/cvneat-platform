# ✅ Checklist Complète : Configuration APNs iOS

## 📋 Ce qui a été fait

- [x] Création de la clé APNs dans Apple Developer
- [x] Configuration des variables dans `.env.local` (local)
- [x] Test de la configuration locale (✅ fonctionne)

## 🔧 Ce qui reste à faire

### 1. Configuration Vercel (Production) ⚠️ CRITIQUE

Les variables d'environnement doivent être ajoutées dans Vercel pour que les notifications fonctionnent en production.

**Étapes** :

1. **Aller sur** https://vercel.com/dashboard
2. **Sélectionner votre projet** CVN'EAT
3. **Aller dans** Settings → Environment Variables
4. **Ajouter** ces 4 variables (une par une) :

   **Variable 1** :
   - **Name** : `APNS_KEY_ID`
   - **Value** : `SFKS857CJX` (votre Key ID)
   - **Environments** : ✅ Production, ✅ Preview, ✅ Development
   - **Save**

   **Variable 2** :
   - **Name** : `APNS_TEAM_ID`
   - **Value** : `54BYSZNUQY` (votre Team ID)
   - **Environments** : ✅ Production, ✅ Preview, ✅ Development
   - **Save**

   **Variable 3** :
   - **Name** : `APNS_BUNDLE_ID`
   - **Value** : `fr.cvneat.app`
   - **Environments** : ✅ Production, ✅ Preview, ✅ Development
   - **Save**

   **Variable 4** :
   - **Name** : `APNS_KEY_CONTENT`
   - **Value** : Le contenu complet du fichier `.p8` (sur une seule ligne avec `\n`)
     - Pour obtenir cette valeur, exécuter : `node scripts/get-apns-key-for-vercel.js`
   - **Environments** : ✅ Production, ✅ Preview, ✅ Development
   - **Save**

5. **Redéployer** l'application sur Vercel pour que les nouvelles variables soient prises en compte

### 2. Configuration Xcode ⚠️ IMPORTANT

Pour que les notifications fonctionnent dans l'app iOS, il faut vérifier la configuration dans Xcode.

**Étapes** :

1. **Ouvrir le projet iOS** :
   ```bash
   npx cap open ios
   ```

2. **Dans Xcode** :
   - Sélectionner le projet "App" dans le navigateur de gauche
   - Aller dans l'onglet **"Signing & Capabilities"**
   - Vérifier que **"Push Notifications"** est dans la liste des capabilities
   - Si absent : Cliquer sur **"+ Capability"** et ajouter **"Push Notifications"**

3. **Vérifier le Bundle ID** :
   - Dans "Signing & Capabilities", vérifier que le **Bundle Identifier** est bien `fr.cvneat.app`
   - Il doit correspondre exactement à celui configuré dans Apple Developer

4. **Vérifier les certificats** :
   - Vérifier que vous avez un **Provisioning Profile** valide
   - Si nécessaire, cliquer sur "Download Manual Profiles" dans Xcode

### 3. Builder l'App iOS

Une fois Xcode configuré :

1. **Builder l'application** :
   ```bash
   npm run build:mobile
   npx cap sync
   ```

2. **Ouvrir dans Xcode** :
   ```bash
   npx cap open ios
   ```

3. **Dans Xcode** :
   - Sélectionner votre iPhone physique (pas le simulateur)
   - Cliquer sur **Run** (▶️) ou `Cmd + R`
   - L'app devrait s'installer sur votre iPhone

### 4. Tester les Notifications

Une fois l'app installée :

1. **Ouvrir l'app** sur iPhone
2. **Se connecter** (livreur ou restaurant)
3. **Créer une commande** depuis le site web
4. **Vérifier** que la notification arrive

## 📝 Résumé des Actions

### ✅ Fait
- [x] Clé APNs créée dans Apple Developer
- [x] Variables configurées dans `.env.local`
- [x] Test local réussi

### ⚠️ À Faire
- [ ] Variables configurées dans Vercel
- [ ] Push Notifications activé dans Xcode
- [ ] Bundle ID vérifié dans Xcode
- [ ] App iOS buildée et installée
- [ ] Notifications testées sur iPhone

## 🎯 Ordre Recommandé

1. **D'abord** : Configurer Vercel (pour la production)
2. **Ensuite** : Configurer Xcode (pour l'app iOS)
3. **Puis** : Builder et installer l'app
4. **Enfin** : Tester les notifications

## 🔍 Vérification Finale

Une fois tout fait, vous devriez pouvoir :
- ✅ Recevoir des notifications push sur iPhone (même si l'app est fermée)
- ✅ Voir les notifications dans les logs du serveur
- ✅ Voir `✅ Notification APNs envoyée avec succès` dans les logs


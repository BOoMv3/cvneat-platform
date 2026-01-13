# 🚀 Guide Étape par Étape : Configuration APNs dans Vercel

## 📋 Prérequis

- ✅ Compte Vercel actif
- ✅ Projet CVN'EAT déployé sur Vercel
- ✅ Variables APNs configurées localement (déjà fait ✅)

## 🎯 Objectif

Ajouter les 4 variables APNs dans Vercel pour que les notifications iOS fonctionnent en production.

---

## 📝 Étape 1 : Obtenir la Valeur de APNS_KEY_CONTENT

**Avant d'aller sur Vercel**, exécutez cette commande pour obtenir la valeur à copier :

```bash
node scripts/get-apns-key-for-vercel.js
```

**Copiez la valeur affichée** (c'est une longue chaîne qui commence par `-----BEGIN PRIVATE KEY-----\n...`)

**⚠️ IMPORTANT** : Gardez cette valeur sous la main, vous en aurez besoin à l'étape 4.

---

## 🌐 Étape 2 : Accéder aux Variables d'Environnement Vercel

1. **Ouvrir votre navigateur** et aller sur : https://vercel.com/dashboard

2. **Se connecter** avec votre compte Vercel

3. **Sélectionner votre projet** "CVN'EAT" (ou le nom de votre projet)

4. **Dans le menu du projet**, cliquer sur **"Settings"** (Paramètres)

5. **Dans le menu de gauche**, cliquer sur **"Environment Variables"** (Variables d'environnement)

Vous devriez voir une page avec :
- Une liste de variables existantes (si vous en avez déjà)
- Un bouton **"+ Add New"** ou **"Add"** en haut

---

## 🔑 Étape 3 : Ajouter APNS_KEY_ID

1. **Cliquer sur** **"+ Add New"** (ou **"Add"**)

2. **Remplir le formulaire** :
   - **Name** (Nom) : `APNS_KEY_ID`
   - **Value** (Valeur) : `SFKS857CJX`
   - **Environments** (Environnements) : Cocher les 3 cases
     - ✅ Production
     - ✅ Preview
     - ✅ Development

3. **Cliquer sur** **"Save"** (Enregistrer)

**✅ Variable 1 ajoutée !**

---

## 🔑 Étape 4 : Ajouter APNS_TEAM_ID

1. **Cliquer à nouveau sur** **"+ Add New"**

2. **Remplir le formulaire** :
   - **Name** : `APNS_TEAM_ID`
   - **Value** : `54BYSZNUQY`
   - **Environments** : Cocher les 3 cases
     - ✅ Production
     - ✅ Preview
     - ✅ Development

3. **Cliquer sur** **"Save"**

**✅ Variable 2 ajoutée !**

---

## 🔑 Étape 5 : Ajouter APNS_BUNDLE_ID

1. **Cliquer à nouveau sur** **"+ Add New"**

2. **Remplir le formulaire** :
   - **Name** : `APNS_BUNDLE_ID`
   - **Value** : `fr.cvneat.app`
   - **Environments** : Cocher les 3 cases
     - ✅ Production
     - ✅ Preview
     - ✅ Development

3. **Cliquer sur** **"Save"**

**✅ Variable 3 ajoutée !**

---

## 🔑 Étape 6 : Ajouter APNS_KEY_CONTENT (La Plus Importante)

1. **Cliquer à nouveau sur** **"+ Add New"**

2. **Remplir le formulaire** :
   - **Name** : `APNS_KEY_CONTENT`
   - **Value** : **Coller la valeur que vous avez copiée à l'étape 1**
     - C'est une longue chaîne qui commence par `-----BEGIN PRIVATE KEY-----\n...`
     - Elle doit se terminer par `...-----END PRIVATE KEY-----`
   - **Environments** : Cocher les 3 cases
     - ✅ Production
     - ✅ Preview
     - ✅ Development

3. **⚠️ VÉRIFIER** que vous avez bien collé TOUTE la valeur (elle est longue, ~262 caractères)

4. **Cliquer sur** **"Save"**

**✅ Variable 4 ajoutée !**

---

## ✅ Étape 7 : Vérification

Vous devriez maintenant voir **4 nouvelles variables** dans la liste :

1. `APNS_KEY_ID` = `SFKS857CJX`
2. `APNS_TEAM_ID` = `54BYSZNUQY`
3. `APNS_BUNDLE_ID` = `fr.cvneat.app`
4. `APNS_KEY_CONTENT` = `-----BEGIN PRIVATE KEY-----\n...` (longue valeur)

**Vérifiez que** :
- ✅ Les 4 variables sont présentes
- ✅ Les 3 environnements sont cochés pour chaque variable
- ✅ Les valeurs sont correctes (pas de fautes de frappe)

---

## 🔄 Étape 8 : Redéployer l'Application

**⚠️ IMPORTANT** : Les nouvelles variables ne sont prises en compte qu'après un redéploiement.

### Option A : Redéploiement Automatique

Si vous avez des commits récents, Vercel redéploiera automatiquement. Sinon :

### Option B : Redéploiement Manuel

1. **Dans Vercel**, aller dans l'onglet **"Deployments"** (Déploiements)
2. **Trouver** le dernier déploiement
3. **Cliquer sur** les **3 points** (⋯) à droite
4. **Sélectionner** **"Redeploy"** (Redéployer)
5. **Confirmer** le redéploiement

**⏱️ Attendre** que le déploiement se termine (2-5 minutes)

---

## 🧪 Étape 9 : Vérifier que ça Fonctionne

Une fois le déploiement terminé :

1. **Tester** en créant une commande depuis le site en production
2. **Vérifier les logs** dans Vercel :
   - Aller dans **"Deployments"**
   - Cliquer sur le dernier déploiement
   - Aller dans **"Functions"** ou **"Logs"**
   - Chercher les messages `✅ Provider APNs créé avec succès` ou `✅ Notification APNs envoyée`

---

## 📸 À Quoi Ça Ressemble dans Vercel

```
Environment Variables

┌─────────────────────────────────────────────────────────────┐
│ Name              │ Value              │ Environments        │
├─────────────────────────────────────────────────────────────┤
│ APNS_KEY_ID       │ SFKS857CJX         │ ✅ Prod ✅ Prev ✅ Dev │
│ APNS_TEAM_ID      │ 54BYSZNUQY        │ ✅ Prod ✅ Prev ✅ Dev │
│ APNS_BUNDLE_ID    │ fr.cvneat.app     │ ✅ Prod ✅ Prev ✅ Dev │
│ APNS_KEY_CONTENT  │ -----BEGIN...     │ ✅ Prod ✅ Prev ✅ Dev │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐛 Problèmes Courants

### "Les variables ne sont pas prises en compte"

**Solution** : Redéployer l'application (étape 8)

### "Je ne trouve pas Environment Variables"

**Solution** : 
- Vérifier que vous êtes bien dans **Settings**
- Chercher dans le menu de gauche
- Ou utiliser la recherche Vercel : `Cmd/Ctrl + K` puis taper "Environment Variables"

### "La valeur de APNS_KEY_CONTENT est trop longue"

**Solution** : 
- C'est normal, elle fait ~262 caractères
- Vérifier que vous avez bien collé TOUTE la valeur
- Pas de guillemets autour de la valeur

### "Les notifications ne fonctionnent pas en production"

**Vérifier** :
1. Les 4 variables sont bien dans Vercel
2. L'application a été redéployée après l'ajout des variables
3. Les logs Vercel montrent des erreurs (voir étape 9)

---

## ✅ Checklist Finale

- [ ] J'ai exécuté `node scripts/get-apns-key-for-vercel.js`
- [ ] J'ai copié la valeur de `APNS_KEY_CONTENT`
- [ ] J'ai ajouté `APNS_KEY_ID` dans Vercel
- [ ] J'ai ajouté `APNS_TEAM_ID` dans Vercel
- [ ] J'ai ajouté `APNS_BUNDLE_ID` dans Vercel
- [ ] J'ai ajouté `APNS_KEY_CONTENT` dans Vercel
- [ ] Les 3 environnements sont cochés pour chaque variable
- [ ] J'ai redéployé l'application
- [ ] Le déploiement est terminé

---

## 🎯 Prochaine Étape

Une fois Vercel configuré, passez à la **configuration Xcode** pour l'app iOS (voir `CHECKLIST_CONFIGURATION_APNS_COMPLETE.md`).

---

**Besoin d'aide ?** Dites-moi à quelle étape vous êtes bloqué et je vous aiderai !


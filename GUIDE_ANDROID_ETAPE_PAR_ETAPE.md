# 📱 Guide Android - Étape par Étape

## 🎯 Objectif
Tester et publier l'application CVN'EAT sur Android.

---

## ÉTAPE 1 : Installer Android Studio (15-30 min)

### 1.1 Télécharger Android Studio
1. Aller sur : https://developer.android.com/studio
2. Cliquer sur **"Download Android Studio"**
3. Télécharger la version pour Windows

### 1.2 Installer Android Studio
1. Lancer le fichier `.exe` téléchargé
2. Suivre l'assistant d'installation (cliquer "Next" à chaque étape)
3. **Important** : Cocher toutes les options proposées :
   - ✅ Android SDK
   - ✅ Android SDK Platform
   - ✅ Android Virtual Device (AVD)
   - ✅ Performance (Intel HAXM)

### 1.3 Premier lancement
1. Ouvrir Android Studio
2. L'assistant va télécharger les composants nécessaires (peut prendre 10-20 min)
3. Attendre la fin du téléchargement

### 1.4 Vérifier l'installation
1. Dans Android Studio : **File > Settings** (ou `Ctrl+Alt+S`)
2. Aller dans **Appearance & Behavior > System Settings > Android SDK**
3. Vérifier que **Android SDK Platform 33** ou **34** est installé
4. Si non, cocher et cliquer **Apply**

---

## ÉTAPE 2 : Préparer le projet (5 min)

### 2.1 Build Next.js
Ouvrir un terminal dans le dossier du projet et exécuter :

```bash
npm run build
```

Cette commande compile votre site Next.js.

### 2.2 Synchroniser avec Capacitor
```bash
npm run capacitor:sync
```

Cette commande copie les fichiers web dans le projet Android.

### 2.3 Ouvrir le projet dans Android Studio
```bash
npm run capacitor:open:android
```

Cette commande ouvre Android Studio avec votre projet Android.

---

## ÉTAPE 3 : Tester l'app sur un appareil/émulateur (10-15 min)

### Option A : Tester sur un téléphone Android (RECOMMANDÉ)

1. **Activer le mode développeur** sur votre téléphone :
   - Aller dans **Paramètres > À propos du téléphone**
   - Appuyer 7 fois sur **"Numéro de build"**
   - Un message "Vous êtes maintenant développeur" apparaît

2. **Activer le débogage USB** :
   - Aller dans **Paramètres > Options développeur**
   - Activer **"Débogage USB"**

3. **Connecter le téléphone** à votre PC avec un câble USB

4. **Dans Android Studio** :
   - Cliquer sur le bouton vert **▶️ Run** (ou `Shift+F10`)
   - Sélectionner votre téléphone dans la liste
   - Cliquer **OK**
   - L'app va s'installer et se lancer sur votre téléphone !

### Option B : Utiliser un émulateur Android

1. **Dans Android Studio** :
   - Cliquer sur **Device Manager** (icône téléphone en haut à droite)
   - Cliquer **Create Device**
   - Choisir un appareil (ex: **Pixel 5**)
   - Cliquer **Next**
   - Télécharger un système (ex: **API 33** ou **API 34**)
   - Cliquer **Finish**

2. **Lancer l'émulateur** :
   - Dans Device Manager, cliquer sur **▶️** à côté de votre appareil virtuel
   - Attendre que l'émulateur démarre (peut prendre 2-3 min)

3. **Lancer l'app** :
   - Cliquer sur **▶️ Run** dans Android Studio
   - Sélectionner l'émulateur
   - L'app va s'installer et se lancer !

---

## ÉTAPE 4 : Vérifier que tout fonctionne (5 min)

Une fois l'app lancée, vérifier :

- ✅ L'app s'ouvre et charge le site CVN'EAT
- ✅ Vous pouvez naviguer sur le site
- ✅ Vous pouvez vous connecter
- ✅ Les fonctionnalités principales marchent

**Si l'app ne charge pas le site** :
- Vérifier votre connexion internet
- Vérifier que `https://cvneat.fr` est accessible depuis un navigateur

---

## ÉTAPE 5 : Configurer Firebase pour les notifications (20-30 min)

### 5.1 Créer un projet Firebase

1. Aller sur : https://console.firebase.google.com/
2. Cliquer **"Ajouter un projet"** (ou "Create a project")
3. **Nom du projet** : `cvneat` ou `cvneat-notifications`
4. Cliquer **Continuer**
5. **Google Analytics** : Désactiver (ou activer si vous voulez)
6. Cliquer **Créer le projet**
7. Attendre la création (30 secondes)
8. Cliquer **Continuer**

### 5.2 Ajouter l'app Android à Firebase

1. Dans Firebase Console, cliquer sur l'icône **Android** 🟢
2. Remplir le formulaire :
   - **Nom du package Android** : `fr.cvneat.app`
     - ⚠️ **IMPORTANT** : C'est l'ID défini dans `capacitor.config.ts`
   - **Surnom de l'app** : `CVN'EAT` (optionnel)
   - **Certificat de signature** : Laisser vide pour l'instant
3. Cliquer **Enregistrer l'application**

### 5.3 Télécharger google-services.json

1. **Télécharger** le fichier `google-services.json`
2. **Placer le fichier** dans : `android/app/google-services.json`
   - ⚠️ **IMPORTANT** : Le fichier doit être dans `android/app/` (pas dans `android/`)

### 5.4 Configurer Android pour utiliser Firebase

1. **Ouvrir** `android/build.gradle` dans Android Studio
2. **Vérifier** que dans la section `buildscript > dependencies`, il y a :
   ```gradle
   classpath 'com.google.gms:google-services:4.4.0'
   ```
   Si ce n'est pas le cas, l'ajouter.

3. **Ouvrir** `android/app/build.gradle`
4. **En haut du fichier** (après `plugins {`), ajouter :
   ```gradle
   plugins {
       id 'com.android.application'
       id 'org.jetbrains.kotlin.android'
       id 'com.capacitor.cli'
       id 'com.google.gms.google-services'  // ← AJOUTER CETTE LIGNE
   }
   ```

5. **Synchroniser** : Dans Android Studio, cliquer sur **"Sync Now"** qui apparaît en haut

### 5.5 Récupérer la Server Key Firebase

1. Dans Firebase Console, cliquer sur **⚙️ Paramètres** (en haut à gauche)
2. Aller dans **Paramètres du projet**
3. Aller dans l'onglet **"Cloud Messaging"**
4. **Si vous voyez "Server key"** : La copier
5. **Si vous ne voyez pas de clé** :
   - Cliquer sur **"Générer une nouvelle clé privée"**
   - Une clé sera générée, la copier

### 5.6 Ajouter la clé dans Vercel

1. Aller sur https://vercel.com
2. Sélectionner votre projet **cvneat-platform**
3. Aller dans **Settings > Environment Variables**
4. Ajouter une variable :
   - **Name** : `FIREBASE_SERVER_KEY`
   - **Value** : Coller la Server Key copiée
   - **Environment** : Cocher **Production**, **Preview**, **Development**
5. Cliquer **Save**

### 5.7 Redéployer sur Vercel

1. Dans Vercel, aller dans **Deployments**
2. Cliquer sur **⋯** (3 points) à côté du dernier déploiement
3. Cliquer **Redeploy**

---

## ÉTAPE 6 : Tester les notifications (10 min)

### 6.1 Rebuild et tester l'app

1. Dans le terminal :
   ```bash
   npm run build
   npm run capacitor:sync
   ```

2. Dans Android Studio, cliquer **▶️ Run** pour relancer l'app

3. **Dans l'app** :
   - Se connecter avec un compte livreur ou restaurant
   - L'app va automatiquement enregistrer le token de notification

### 6.2 Tester l'envoi de notification

1. Aller sur le site web (en tant qu'admin)
2. Créer une commande ou changer le statut d'une commande
3. Le livreur/restaurant devrait recevoir une notification sur son téléphone Android

---

## ÉTAPE 7 : Préparer pour la publication (30-45 min)

### 7.1 Créer un keystore (signature de l'app)

1. **Ouvrir un terminal** dans le dossier du projet
2. **Exécuter** :
   ```bash
   cd android/app
   keytool -genkey -v -keystore cvneat-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias cvneat
   ```

3. **Remplir les informations** :
   - **Mot de passe** : Choisir un mot de passe fort (⚠️ **LE NOTER QUELQUE PART**)
   - **Nom et prénom** : Votre nom
   - **Unité organisationnelle** : CVN'EAT
   - **Organisation** : CVN'EAT
   - **Ville** : Ganges (ou votre ville)
   - **État** : Occitanie
   - **Code pays** : FR

4. **Le fichier `cvneat-release-key.jks`** sera créé dans `android/app/`

### 7.2 Créer le fichier key.properties

1. **Créer un fichier** `android/key.properties` avec ce contenu :
   ```properties
   storePassword=VOTRE_MOT_DE_PASSE_KEYSTORE
   keyPassword=VOTRE_MOT_DE_PASSE_KEYSTORE
   keyAlias=cvneat
   storeFile=app/cvneat-release-key.jks
   ```

2. **Remplacer** `VOTRE_MOT_DE_PASSE_KEYSTORE` par le mot de passe que vous avez choisi

3. **⚠️ IMPORTANT** : Ajouter `key.properties` au `.gitignore` pour ne pas le publier sur GitHub !

### 7.3 Configurer build.gradle pour la signature

1. **Ouvrir** `android/app/build.gradle` dans Android Studio
2. **Ajouter en haut du fichier** (avant `android {`) :
   ```gradle
   def keystorePropertiesFile = rootProject.file("key.properties")
   def keystoreProperties = new Properties()
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }
   ```

3. **Dans la section `android {`**, ajouter :
   ```gradle
   signingConfigs {
       release {
           keyAlias keystoreProperties['keyAlias']
           keyPassword keystoreProperties['keyPassword']
           storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
           storePassword keystoreProperties['storePassword']
       }
   }
   ```

4. **Dans `buildTypes { release {`**, ajouter :
   ```gradle
   signingConfig signingConfigs.release
   ```

5. **Synchroniser** : Cliquer **"Sync Now"**

### 7.4 Build l'APK/AAB de production

1. Dans Android Studio : **Build > Generate Signed Bundle / APK**
2. Choisir **Android App Bundle** (recommandé pour Google Play)
3. Cliquer **Next**
4. Sélectionner votre keystore : `android/app/cvneat-release-key.jks`
5. Entrer le mot de passe
6. Cliquer **Next**
7. Choisir **release**
8. Cliquer **Create**
9. Le fichier `.aab` sera créé dans `android/app/release/`

---

## ÉTAPE 8 : Publier sur Google Play (1-2 heures)

### 8.1 Créer un compte développeur

1. Aller sur : https://play.google.com/console
2. Cliquer **"Créer un compte"**
3. **Payer les 25$** (une seule fois, valable à vie)
4. Remplir les informations de votre compte

### 8.2 Créer l'application

1. Dans Google Play Console, cliquer **"Créer une application"**
2. **Nom de l'app** : CVN'EAT
3. **Langue par défaut** : Français
4. **Type d'app** : Application
5. **Gratuite ou payante** : Gratuite
6. Cliquer **Créer**

### 8.3 Remplir les informations de l'app

1. **Description courte** (80 caractères max) :
   ```
   Livraison de repas dans les Cévennes - Commandez en ligne !
   ```

2. **Description complète** :
   ```
   CVN'EAT est la plateforme de livraison de repas dans les Cévennes.
   
   Commandez vos plats préférés depuis votre smartphone et recevez-les rapidement à domicile.
   
   Fonctionnalités :
   - Commandes en ligne simples et rapides
   - Suivi en temps réel de votre commande
   - Paiement sécurisé par carte bancaire
   - Notifications push pour suivre votre commande
   
   Restaurants partenaires :
   - Pizzas, burgers, plats du jour, et bien plus !
   
   Zones de livraison : Ganges, Laroque, Saint-Bauzille, Sumène
   ```

3. **Icône de l'app** :
   - Taille : 512x512 pixels
   - Format : PNG
   - Créer une icône avec le logo CVN'EAT

4. **Screenshots** (minimum 2) :
   - Prendre des captures d'écran de l'app sur votre téléphone
   - Taille minimale : 320px de hauteur
   - Format : PNG ou JPEG

5. **Politique de confidentialité** :
   - Créer une page sur votre site avec votre politique
   - URL : `https://cvneat.fr/privacy` (ou créer cette page)

### 8.4 Téléverser l'application

1. Dans Google Play Console, aller dans **Production** (menu de gauche)
2. Cliquer **"Créer une version"**
3. Cliquer **"Téléverser"**
4. Sélectionner le fichier `.aab` créé à l'étape 7.4
5. Attendre la fin du téléversement (peut prendre 5-10 min)

### 8.5 Soumettre pour révision

1. Remplir toutes les sections obligatoires (marquées avec ⚠️)
2. Cliquer **"Soumettre pour révision"**
3. Google va examiner votre app (généralement 1-3 jours)
4. Vous recevrez un email quand l'app sera approuvée !

---

## ✅ Checklist finale

Avant de soumettre, vérifier :

- [ ] L'app fonctionne correctement sur un téléphone
- [ ] Les notifications push fonctionnent
- [ ] Le keystore est créé et sauvegardé en sécurité
- [ ] Le fichier `key.properties` est dans `.gitignore`
- [ ] Firebase est configuré
- [ ] `FIREBASE_SERVER_KEY` est dans Vercel
- [ ] L'icône de l'app est prête (512x512)
- [ ] Les screenshots sont prêts
- [ ] La politique de confidentialité est créée
- [ ] Le fichier `.aab` est généré

---

## 🆘 Problèmes courants

### L'app ne se lance pas
- Vérifier que `npm run build` a réussi
- Vérifier que `npm run capacitor:sync` a réussi
- Vérifier votre connexion internet

### Erreur "google-services.json not found"
- Vérifier que le fichier est dans `android/app/google-services.json`
- Faire `npm run capacitor:sync` après avoir ajouté le fichier

### Erreur de signature
- Vérifier que `key.properties` existe et contient les bonnes informations
- Vérifier que le keystore existe dans `android/app/`

### Les notifications ne fonctionnent pas
- Vérifier que Firebase est bien configuré
- Vérifier que `FIREBASE_SERVER_KEY` est dans Vercel
- Vérifier que l'utilisateur est connecté dans l'app

---

## 📞 Besoin d'aide ?

Si vous bloquez à une étape, dites-moi où vous en êtes et je vous aiderai !

---

**Bon courage ! 🚀**


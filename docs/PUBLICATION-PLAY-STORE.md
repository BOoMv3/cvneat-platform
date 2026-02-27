# Publication de l'app CVN'EAT sur le Google Play Store

Ce guide décrit les étapes pour publier l'app officiellement sur le Play Store avec icône, nom, et distribution aux utilisateurs.

---

## 1. Icône et identité visuelle

### Icône Android (déjà configuré)

L'icône est synchronisée via :

```bash
npm run sync:android-icon
```

Ce script copie `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png` (ou `public/icon-512x512.png`) vers les ressources Android (`mipmap-mdpi` à `mipmap-xxxhdpi`).

### Vérifier l'icône

1. Ouvre Android Studio : `npm run capacitor:open:android`
2. Vérifie que l'icône apparaît correctement dans `app/src/main/res/mipmap-*/ic_launcher.png`
3. Lance l'app sur un émulateur ou appareil pour voir l'icône sur l'écran d'accueil

---

## 2. Signer l'app pour la production (release)

Le Play Store exige un APK/AAB signé avec une clé de production.

### Créer une clé keystore (une seule fois)

```bash
keytool -genkey -v -keystore cvneat-release.keystore -alias cvneat -keyalg RSA -keysize 2048 -validity 10000
```

- Mets ce fichier en lieu sûr (ne le committe pas dans Git)
- Conserve le mot de passe et l'alias

### Configurer le signing release dans `android/app/build.gradle`

1. Crée `android/keystore.properties` (ne pas committer) :

```properties
storePassword=TON_MOT_DE_PASSE
keyPassword=TON_MOT_DE_PASSE
keyAlias=cvneat
storeFile=cvneat-release.keystore
```

2. Place `cvneat-release.keystore` dans `android/` ou le chemin indiqué dans `storeFile`
3. Modifie `android/app/build.gradle` pour utiliser le signing release :

```groovy
android {
    ...
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            if (keystorePropertiesFile.exists()) {
                def keystoreProperties = new Properties()
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 3. Build release

```bash
# 1. Build Next.js + sync Capacitor
npm run build:android

# 2. Générer l'AAB (Android App Bundle) recommandé par Google
cd android && ./gradlew bundleRelease
```

L'AAB est généré dans : `android/app/build/outputs/bundle/release/app-release.aab`

Le Play Store préfère l'AAB à l'APK (sizes optimisés par appareil).

Pour un APK release :

```bash
cd android && ./gradlew assembleRelease
```

APK : `android/app/build/outputs/apk/release/app-release.apk`

---

## 4. Créer un compte développeur Google Play

1. Va sur [Google Play Console](https://play.google.com/console)
2. Crée ou utilise un compte Google
3. Paye les frais uniques (~25 $) pour créer un compte développeur
4. Accepte les accords

---

## 5. Créer l’application dans la Console

1. **Créer une application** → Nom : CVN'EAT
2. **Tableau de bord** → Compléter :
   - Politique de confidentialité (URL obligatoire)
   - Classification du contenu (questionnaire)
   - Cible (public, publicités ou non)
   - Prix (gratuit / payant)

3. **Fiche Play Store** :
   - Titre : CVN'EAT
   - Description courte (80 caractères)
   - Description longue (4000 caractères)
   - Captures d’écran (min. 2 par type d’appareil : téléphone, tablette si applicable)
   - Icône haute résolution (512×512 px)
   - Bannière (1024×500 px) si requis

4. **Contenu de l’application** :
   - Télécharge `app-release.aab` dans « Production » ou « Test interne »
   - Renseigne le numéro de version et les notes de version

5. **Examen** :
   - Envoie pour examen
   - Google vérifie généralement sous 24–48 h (peut aller jusqu’à 7 jours)

---

## 6. Domaines Stripe / paiement

Si l’app gère des paiements :

- Inscris le **package name** Android dans Stripe (paramètres → domaines autorisés)
- Vérifie que l’URL de redirection Stripe fonctionne en app (capacitor:// ou https)

---

## 7. Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run sync:android-icon` | Synchronise l’icône iOS → Android |
| `npm run build:android` | Build Next.js + sync Capacitor |
| `npm run apk:debug` | APK debug (tests, installation directe) |
| `cd android && ./gradlew bundleRelease` | AAB release pour Play Store |
| `cd android && ./gradlew assembleRelease` | APK release signé |
| `npm run capacitor:open:android` | Ouvre le projet dans Android Studio |

---

*Dernière mise à jour : janvier 2025*

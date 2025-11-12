# Mobile (Capacitor) – Guide d'onboarding

Ce dossier décrit comment empaqueter la webapp Next.js existante dans des applications mobiles Android et iOS à l'aide de [Capacitor](https://capacitorjs.com/).

## 1. Pré-requis

- Node.js / npm
- `npm install`
- Xcode (pour iOS)
- Android Studio (pour Android)
- Compte Apple Developer + Google Play Console pour les publications

## 2. Build web à intégrer

Par défaut la config (`capacitor.config.ts`) pointe vers `webDir: "out"`. Deux approches sont possibles :

1. **Export statique** (si la webapp peut être exportée) :
   ```bash
   npm run build
   npx next export
   ```
   Cela génère `out/` qui sera copié dans les projets mobiles.

2. **Chargement distant** (si l'application nécessite SSR / API routes) :
   - Mettre à jour `capacitor.config.ts` et renseigner `server.url` avec l'URL de prod, ex. :
     ```ts
     server: {
       url: 'https://app.cvneat.fr',
       cleartext: false
     }
     ```
   - Recompiler les apps mobiles pour prendre en compte ce changement.

## 3. Commandes utiles

```bash
# Copier les assets web dans les projets mobiles
npx cap copy

# Synchroniser Capacitor (met à jour les plugins / config)
npx cap sync

# Ouvrir le projet Android dans Android Studio
npx cap open android

# Ouvrir le projet iOS dans Xcode
npx cap open ios
```

> ℹ️ `npm run build:mobile` peut être ajouté ultérieurement pour automatiser `next build` + `next export` + `npx cap sync` si besoin.

## 4. Ajout des plateformes

Les dossiers `android/` et `ios/` ne sont pas créés automatiquement. Pour les initialiser :

```bash
npx cap add android
npx cap add ios
```

Ces commandes peuvent être exécutées après la configuration de l'environnement (SDK Android, Xcode, etc.).

## 5. Plugins / fonctionnalités natives

- Les plugins Capacitor peuvent être ajoutés via `npm install @capacitor/<plugin>` puis `npx cap sync`.
- Pour l'impression Bluetooth / USB : prévoir un plugin dédié (ex. plugin ESC/POS) et tester sur la passerelle matérielle cible.

## 6. Publication

1. Construire les projets : `npx cap copy` puis `npx cap open android` / `ios`.
2. Générer un **AAB** côté Android, une archive `.ipa` via Xcode.
3. Suivre les guidelines Play Store / App Store (icônes, captures, privacy, etc.).

## 7. Points de vigilance

- Ne pas commiter les builds `out/` / `dist/`.
- Toujours tester la webapp après modifications (les scripts habituels `npm run dev`, `npm run build` restent inchangés).
- Adapter `server.url` si l'appli mobile doit consommer directement l'instance de prod.

---

Ce guide pourra être enrichi au fur et à mesure que les intégrations mobiles (Bluetooth, notifications natives, etc.) seront implémentées.


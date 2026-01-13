# 🔍 Guide : Trouver "Signing & Capabilities" dans Xcode

## ⚠️ Problème

Vous ne voyez pas l'onglet "Signing & Capabilities" dans Xcode.

## ✅ Solution : Vérifier la Sélection

### Étape 1 : Vérifier ce qui est Sélectionné

Dans le **navigateur de gauche** (panneau de gauche), vous devez voir :

```
📁 App (projet - icône bleue)
  └── 📁 App (dossier)
      └── 📄 AppDelegate.swift
      └── 📄 Info.plist
      └── ...
```

**IMPORTANT** : Vous devez sélectionner le **PROJET "App"** (l'icône bleue en haut), PAS un fichier.

### Étape 2 : Vérifier le TARGET

1. **Une fois le projet "App" sélectionné**, dans la **fenêtre principale** (au centre), vous devriez voir en haut :

```
┌─────────────────────────────────────────┐
│ PROJECT: App                             │
│ TARGETS: App  ← CLIQUER ICI             │
└─────────────────────────────────────────┘
```

2. **Cliquer sur** **"TARGETS: App"** (ou juste "App" sous TARGETS)

3. **Maintenant** vous devriez voir les onglets :
   - General
   - **Signing & Capabilities** ← **CET ONGLET DEVRAIT APPARAÎTRE**
   - Info
   - Build Settings
   - etc.

### Étape 3 : Si "Signing & Capabilities" n'Apparaît Toujours Pas

**Vérifier** :

1. **Dans le navigateur de gauche**, vous avez bien cliqué sur :
   - ✅ Le **projet "App"** (icône bleue)
   - ❌ PAS sur un fichier (comme AppDelegate.swift)

2. **Dans la fenêtre principale**, vous avez bien sélectionné :
   - ✅ Le **TARGET "App"** (sous "TARGETS")
   - ❌ PAS le PROJECT "App"

3. **Vérifier le Signing** :
   - Si le Team n'est pas configuré, Xcode peut ne pas afficher "Signing & Capabilities"
   - Essayer de configurer le Team d'abord

## 🎯 Étapes Complètes

### Option A : Si vous voyez "TARGETS"

1. **Cliquer sur** **"App"** sous "TARGETS" (pas "App" sous "PROJECT")
2. **Les onglets devraient changer** et "Signing & Capabilities" devrait apparaître
3. **Cliquer sur** "Signing & Capabilities"
4. **Scroller vers le bas** pour voir "Capabilities"
5. **Cliquer sur** "+ Capability"

### Option B : Si vous ne voyez pas "TARGETS"

1. **Dans le navigateur de gauche**, **sélectionner** le projet **"App"** (icône bleue)
2. **Dans la fenêtre principale**, **cliquer** sur l'icône **"App"** à côté de "TARGETS"
3. **Les onglets devraient changer**
4. **Chercher** l'onglet "Signing & Capabilities"

### Option C : Via le Menu

1. **Dans Xcode**, menu **"Editor"** → **"Add Capability..."**
2. **Sélectionner** "Push Notifications"
3. **Cliquer** sur "Add"

## 📸 À Quoi Ça Devrait Ressembler

```
Navigateur Gauche          Fenêtre Principale
┌──────────────┐          ┌─────────────────────────────┐
│ 📁 App       │          │ PROJECT: App                  │
│   └── 📁 App │          │ TARGETS: App  ← CLIQUER ICI  │
│       └── 📄 │          │                               │
│              │          │ [General] [Signing & Cap...]  │
│              │          │                               │
│              │          │ Team: [Votre Équipe]          │
│              │          │ Bundle Identifier: ...       │
│              │          │                               │
│              │          │ Capabilities                  │
│              │          │ ┌───────────────────────────┐ │
│              │          │ │ + Capability  ← CLIQUER   │ │
│              │          │ └───────────────────────────┘ │
└──────────────┘          └─────────────────────────────┘
```

## 🐛 Si Rien ne Fonctionne

**Alternative** : Ajouter via le fichier `.entitlements`

1. **Dans le navigateur de gauche**, cliquer droit sur le dossier "App"
2. **New File...** → **iOS** → **App ID** → **Entitlements File**
3. **Nommer** : `App.entitlements`
4. **Ouvrir** le fichier et ajouter :
   ```xml
   <key>aps-environment</key>
   <string>development</string>
   ```
5. **Dans Build Settings**, chercher "Code Signing Entitlements"
6. **Mettre** : `App/App.entitlements`

Mais normalement, l'option "+ Capability" devrait être disponible dans "Signing & Capabilities".

---

**Essayez de cliquer sur "TARGETS: App" dans la fenêtre principale et dites-moi ce que vous voyez !**


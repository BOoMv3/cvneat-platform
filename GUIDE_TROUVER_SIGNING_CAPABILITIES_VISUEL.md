# 🎯 Guide Visuel : Trouver "Signing & Capabilities" dans Xcode

## ⚠️ Vous êtes actuellement dans "Build Settings"

D'après votre capture d'écran, vous voyez :
- Info
- **Build Settings** ← Vous êtes ici
- Package Dependencies

## ✅ Solution : Changer de Sélection

### Étape 1 : Dans le Navigateur de Gauche

**Regardez le panneau de gauche** (navigateur de fichiers). Vous devez voir :

```
📁 App (icône bleue)  ← CLIQUER ICI
  └── 📁 App (dossier)
      └── 📄 AppDelegate.swift
      └── 📄 Info.plist
      └── ...
```

**Cliquez sur** le projet **"App"** (l'icône bleue en haut, pas le dossier).

### Étape 2 : Dans la Fenêtre Principale

**Une fois le projet "App" sélectionné**, regardez la **fenêtre principale** (au centre).

**En haut**, vous devriez voir quelque chose comme :

```
┌─────────────────────────────────────────┐
│ PROJECT                                  │
│   App                                    │
│                                          │
│ TARGETS                                  │
│   App  ← CLIQUER ICI (pas PROJECT)      │
└─────────────────────────────────────────┘
```

**⚠️ IMPORTANT** : Cliquez sur **"App"** sous **"TARGETS"** (pas sous "PROJECT").

### Étape 3 : Les Onglets Devraient Changer

**Après avoir cliqué sur le TARGET "App"**, les onglets en haut devraient changer :

```
[General] [Signing & Capabilities] [Info] [Build Settings] ...
```

**Cliquez sur** **"Signing & Capabilities"**.

### Étape 4 : Trouver "+ Capability"

**Dans "Signing & Capabilities"**, scrollez vers le bas. Vous devriez voir :

```
┌─────────────────────────────────────────┐
│ Signing & Capabilities                   │
├─────────────────────────────────────────┤
│ Team: [Votre Équipe]                     │
│ Bundle Identifier: fr.cvneat.app         │
│ Automatically manage signing: ✅         │
│                                          │
│ Capabilities                             │
│ ┌─────────────────────────────────────┐ │
│ │ + Capability  ← CLIQUER ICI         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Cliquez sur** **"+ Capability"** et ajoutez "Push Notifications".

## 🔄 Alternative : Via le Menu Xcode

Si vous ne trouvez toujours pas :

1. **Menu** → **Editor** → **Add Capability...**
2. **Sélectionner** "Push Notifications"
3. **Cliquer** sur "Add"

## 📸 Résumé Visuel

```
Navigateur Gauche          Fenêtre Principale
┌──────────────┐          ┌─────────────────────────────┐
│ 📁 App       │          │ PROJECT: App                 │
│   └── 📁 App │          │   └── App                   │
│              │          │                              │
│              │          │ TARGETS: App  ← CLIQUER ICI │
│              │          │   └── App                    │
│              │          │                              │
│              │          │ [General] [Signing & Cap...]│
│              │          │                              │
│              │          │ Team: ...                    │
│              │          │ Bundle ID: ...               │
│              │          │                              │
│              │          │ Capabilities                 │
│              │          │ ┌───────────────────────────┐│
│              │          │ │ + Capability              ││
│              │          │ └───────────────────────────┘│
└──────────────┘          └─────────────────────────────┘
```

## ⚠️ Si "Signing & Capabilities" n'Apparaît Toujours Pas

**Vérifier** :
1. Vous avez bien cliqué sur le **TARGET "App"** (pas le PROJECT)
2. Le **Team** est configuré dans les Build Settings
3. **Automatically manage signing** est activé

**Si rien ne fonctionne**, je peux ajouter Push Notifications directement dans le fichier de projet (méthode alternative).

---

**Essayez de cliquer sur "App" sous "TARGETS" et dites-moi ce que vous voyez !**


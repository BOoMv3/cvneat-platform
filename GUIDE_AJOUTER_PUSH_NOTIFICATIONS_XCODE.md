# ✅ Guide : Ajouter Push Notifications dans Xcode

## 🎯 Objectif

Ajouter la capability "Push Notifications" dans Xcode pour que les notifications iOS fonctionnent.

## 📝 Étapes Détaillées

### Étape 1 : Dans Xcode

1. **Assurez-vous** que Xcode est ouvert avec votre projet iOS
   - Si pas ouvert : `npx cap open ios`

2. **Dans le navigateur de gauche** (panneau de gauche), **sélectionner** le projet **"App"**
   - C'est l'icône bleue en haut
   - Pas "App" dans le dossier, mais le projet lui-même (la première icône bleue)

### Étape 2 : Aller dans Signing & Capabilities

1. **Dans la fenêtre principale** (au centre), vous verrez plusieurs onglets en haut :
   - General
   - **Signing & Capabilities** ← **CLIQUER ICI**
   - Info
   - Build Settings
   - etc.

2. **Cliquer sur** **"Signing & Capabilities"**

### Étape 3 : Trouver la Section Capabilities

1. **Scroller vers le bas** de la fenêtre "Signing & Capabilities"

2. **Vous verrez** une section appelée **"Capabilities"** ou **"+ Capability"**
   - C'est généralement en bas de la fenêtre
   - Il peut y avoir déjà d'autres capabilities listées

### Étape 4 : Ajouter Push Notifications

1. **Cliquer sur** le bouton **"+ Capability"** (en haut à gauche de la section Capabilities)
   - C'est un bouton avec un **"+"** suivi de "Capability"

2. **Une fenêtre s'ouvre** avec une liste de capabilities disponibles

3. **Dans la liste**, chercher **"Push Notifications"**
   - Vous pouvez utiliser la barre de recherche en haut de la fenêtre
   - Taper "Push" ou "Notification"

4. **Double-cliquer** sur **"Push Notifications"**
   - OU cliquer une fois puis cliquer sur "Add" en bas

5. **Vérifier** que "Push Notifications" apparaît maintenant dans la liste des Capabilities

## ✅ Vérification

Après avoir ajouté, vous devriez voir :

```
Capabilities
├── Push Notifications ✅
└── (autres capabilities si présentes)
```

## 🐛 Si le Bouton "+ Capability" n'Apparaît Pas

### Solution 1 : Vérifier que vous êtes au bon endroit

- Assurez-vous d'être dans **"Signing & Capabilities"**
- Assurez-vous d'avoir sélectionné le **projet "App"** (pas juste un fichier)

### Solution 2 : Vérifier le Target

1. **En haut de la fenêtre**, vérifier que vous avez sélectionné le **Target "App"**
   - Il y a un menu déroulant "TARGETS" avec "App" sélectionné

### Solution 3 : Vérifier le Signing

1. **Dans "Signing & Capabilities"**, vérifier que :
   - **Team** est sélectionné
   - **Automatically manage signing** est coché
   - Le **Bundle Identifier** est `fr.cvneat.app`

Si le signing n'est pas configuré, Xcode peut ne pas afficher le bouton "+ Capability".

## 📸 À Quoi Ça Ressemble

```
┌─────────────────────────────────────────────────┐
│ Signing & Capabilities                          │
├─────────────────────────────────────────────────┤
│ Team: [Votre Équipe] ▼                          │
│ Bundle Identifier: fr.cvneat.app                │
│ Automatically manage signing: ✅                 │
│                                                 │
│ Capabilities                                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ + Capability  ← CLIQUER ICI                 │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ (Après ajout)                                   │
│ Capabilities                                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ Push Notifications ✅                        │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## ⚠️ Important

- **Push Notifications** doit être dans la liste des Capabilities
- Si vous ne le voyez pas, c'est que l'ajout n'a pas fonctionné
- Réessayez en suivant les étapes ci-dessus

## 🎯 Prochaine Étape

Une fois "Push Notifications" ajouté, vous pouvez :
1. Builder l'app : `Cmd + R` dans Xcode
2. Installer sur votre iPhone
3. Tester les notifications

---

**Dites-moi si vous arrivez à ajouter "Push Notifications" ou si vous avez besoin d'aide !**


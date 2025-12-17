# Guide: Configurer la branche de production dans Vercel

## Où trouver la configuration de la branche

1. **Vercel Dashboard** → Votre projet
2. **Settings** (en haut à droite)
3. **Git** (dans le menu de gauche)
4. Cherchez la section **"Production Branch"** ou **"Production"**

## Si vous ne voyez pas "Production Branch"

### Option 1: Dans Settings → Git
- Regardez la section **"Connected Git Repository"**
- Il devrait y avoir une option pour choisir la branche de production
- Cliquez sur **"Edit"** ou **"Configure"**

### Option 2: Dans Settings → General
- Parfois la branche de production est dans **Settings → General**
- Cherchez **"Production Branch"** ou **"Default Branch"**

### Option 3: Dans le déploiement
- Allez dans **Deployments**
- Cliquez sur les **3 points** (⋯) à côté d'un déploiement
- Cherchez **"Promote to Production"** ou **"Set as Production"**

## Configuration recommandée

- **Production Branch**: `main`
- **Preview Branches**: `*` (toutes les branches)

## Vérification

Après configuration, vérifiez que:
1. Les nouveaux commits sur `main` déclenchent automatiquement un déploiement
2. Le dernier commit déployé correspond à `c44bcde` ou plus récent

## Si vous ne trouvez toujours pas

1. Vérifiez que vous êtes bien dans le bon projet Vercel
2. Vérifiez que vous avez les permissions d'administrateur
3. Essayez de créer un nouveau déploiement manuellement depuis GitHub


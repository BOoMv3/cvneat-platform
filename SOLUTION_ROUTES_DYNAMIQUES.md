# 🔧 Solution Complète pour les Routes Dynamiques dans l'App Mobile

## ❌ Problème

Les routes dynamiques (`/restaurants/[id]`, `/profile`, etc.) ne fonctionnent pas dans l'app mobile Capacitor car :
1. Next.js router ne fonctionne pas correctement dans un contexte statique avec Capacitor
2. Les composants ne sont pas chargés correctement depuis les fichiers HTML statiques

## ✅ Solution Implémentée

### 1. Wrapper avec Extraction d'ID depuis l'URL

Le composant `app/restaurants/[id]/page.js` extrait maintenant l'ID depuis :
- `window.location.pathname`
- `window.location.href`
- `window.location.hash`

### 2. Fichiers HTML Statiques

Des fichiers HTML statiques sont créés pour toutes les routes dynamiques :
- `/restaurants/[id]/index.html`
- `/profile/index.html`
- `/orders/[id]/index.html`
- etc.

### 3. Script de Routage

Un script inline dans le HTML force le routage Next.js vers la route correcte.

## 🧪 Test

1. **Ouvrir Xcode** : `npx cap open ios`
2. **Clean Build** : `Shift + Cmd + K`
3. **Lancer l'app** : `Cmd + R`
4. **Tester** :
   - Cliquer sur un restaurant → doit ouvrir `/restaurants/[id]`
   - Aller dans le profil → doit fonctionner

## 🔍 Debug

Si ça ne fonctionne toujours pas, vérifier dans la console :
- `[RestaurantDetailWrapper] ID extrait: [id]`
- `[Navigation] Redirection vers restaurant: /restaurants/[id]`

Si l'ID n'est pas extrait, le problème vient de l'URL. Vérifier que `window.location.pathname` contient bien `/restaurants/[id]`.


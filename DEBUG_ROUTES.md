# 🔍 Debug des Routes Dynamiques

## ⚠️ Erreurs iOS (Normales)

Les erreurs `RTIInputSystemClient` sont des **warnings iOS normaux** du système de saisie de texte. Elles n'affectent **PAS** le fonctionnement de l'application.

## 🔍 Vérifier si les Routes Fonctionnent

### 1. Ouvrir la Console Safari/Web Inspector

Dans Xcode :
1. **Window** → **Devices and Simulators**
2. Sélectionner votre appareil/simulateur
3. Cliquer sur **Open Console** ou utiliser Safari → Develop → [Votre App]

### 2. Logs à Chercher

Quand vous cliquez sur un restaurant, vous devriez voir :

```
[Navigation] Redirection vers restaurant: /restaurants/[id]
[Restaurant Route] Script de routage chargé
[Restaurant Route] ID restaurant trouvé: [id]
[Restaurant Route] Next.js router trouvé, navigation vers /restaurants/[id]
[RestaurantDetailWrapper] Extraction ID depuis URL: capacitor://localhost/restaurants/[id]
[RestaurantDetailWrapper] ID trouvé via pathname: [id]
[RestaurantDetailWrapper] Rendu du composant avec ID: [id]
```

### 3. Si les Logs N'Apparaissent Pas

- Le fichier HTML n'est pas chargé → Vérifier que `out/restaurants/[id]/index.html` existe
- Next.js n'est pas chargé → Attendre quelques secondes
- L'ID n'est pas extrait → Vérifier l'URL dans `window.location.href`

### 4. Solution de Contournement

Si ça ne fonctionne toujours pas, essayer de naviguer directement :
```javascript
// Dans la console Safari
window.location.href = '/restaurants/[ID_DU_RESTAURANT]';
```

## 📝 Prochaines Étapes

1. Tester dans l'app
2. Vérifier les logs dans la console
3. Me dire ce que vous voyez dans les logs


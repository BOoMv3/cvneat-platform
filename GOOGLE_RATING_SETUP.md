# Configuration des Notes Google pour les Restaurants

Ce guide explique comment configurer l'intégration Google Places pour afficher les notes Google des restaurants sur CVN'EAT.

## Prérequis

1. **Clé API Google Places** : Vous devez avoir une clé API Google Places activée
   - Créez un projet sur [Google Cloud Console](https://console.cloud.google.com/)
   - Activez l'API "Places API"
   - Créez une clé API et configurez les restrictions appropriées

2. **Variables d'environnement** : Ajoutez votre clé API dans `.env.local` :
   ```
   GOOGLE_PLACES_API_KEY=votre_cle_api_google
   ```

## Installation de la base de données

Exécutez le script SQL pour ajouter les colonnes nécessaires :

```sql
-- Exécuter dans Supabase SQL Editor
\i add-google-rating-columns.sql
```

Ou exécutez directement le contenu du fichier `add-google-rating-columns.sql` dans votre base de données Supabase.

## Configuration d'un restaurant

### Méthode 1 : Via l'interface Admin

1. Connectez-vous en tant qu'administrateur
2. Allez dans **Admin > Restaurants**
3. Sélectionnez un restaurant
4. Dans la section **"Configuration Google Places"** :
   - Entrez le **Google Place ID** du restaurant
   - Cliquez sur **"Mettre à jour"**

### Méthode 2 : Trouver le Place ID Google

1. Allez sur [Google Maps](https://www.google.com/maps)
2. Recherchez le restaurant
3. Cliquez sur le restaurant pour voir ses détails
4. L'URL contiendra le Place ID dans le format : `.../place/ChIJN1t_tDeuEmsRUsoyG83frY4/...`
5. Ou utilisez l'outil [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)

### Méthode 3 : Via l'API

```javascript
// Mettre à jour les notes Google pour un restaurant
const response = await fetch('/api/restaurants/google', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    restaurant_id: 'uuid-du-restaurant',
    place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    force_update: true // Force la mise à jour même si < 24h
  })
});
```

## Fonctionnement

1. **Priorité des notes** :
   - Si un restaurant a un `google_place_id` et une `google_rating`, la note Google est utilisée
   - Sinon, le système utilise les notes calculées depuis les avis de la base de données

2. **Mise à jour automatique** :
   - Les notes Google sont mises à jour automatiquement toutes les 24 heures
   - Vous pouvez forcer une mise à jour via l'interface admin ou l'API

3. **Endpoints API** :
   - `GET /api/restaurants/google?restaurant_id=xxx` : Récupérer les notes Google d'un restaurant
   - `GET /api/restaurants/google?place_id=xxx` : Récupérer les notes Google depuis un Place ID
   - `POST /api/restaurants/google` : Mettre à jour les notes Google pour un restaurant

## Affichage

Les notes Google sont automatiquement affichées sur :
- La page d'accueil (liste des restaurants)
- La page de détails d'un restaurant
- Les cartes de restaurants

## Notes importantes

- Les notes Google sont mises en cache et mises à jour toutes les 24 heures pour économiser les appels API
- Assurez-vous d'avoir configuré les quotas et limites dans Google Cloud Console
- Respectez les [conditions d'utilisation de Google Maps](https://cloud.google.com/maps-platform/terms)

## Support

Pour toute question ou problème, consultez la documentation Google Places API :
- [Documentation officielle](https://developers.google.com/maps/documentation/places/web-service)
- [Guide Place ID](https://developers.google.com/maps/documentation/places/web-service/place-id)


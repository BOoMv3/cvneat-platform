# Ajout du menu SMAASH BURGER

## 📋 Instructions

Pour ajouter automatiquement le menu complet du restaurant SMAASH BURGER, utilisez l'API admin suivante :

### Endpoint
```
POST /api/admin/add-menu-items
```

### Authentification
Vous devez être connecté en tant qu'admin et inclure votre token dans le header :
```
Authorization: Bearer <votre_token_admin>
```

### Corps de la requête
```json
{
  "restaurantName": "SMAASH"
}
```

ou

```json
{
  "restaurantId": "<uuid_du_restaurant>"
}
```

### Exemple avec cURL
```bash
curl -X POST http://localhost:3000/api/admin/add-menu-items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <votre_token_admin>" \
  -d '{"restaurantName": "SMAASH"}'
```

### Plats ajoutés

Le script ajoutera automatiquement les **14 plats** suivants :

#### 🍔 Burgers (6 plats)
- Classic Smaash Burger - 13.50€
- Classic Smaash Bacon - 15.50€
- Le Montagnard - 16.50€
- Le Spicy Crispy Chicken - 16.00€
- Le CVNOL - 16.50€
- L'All Black - 17.00€

#### 🍱 Poke Bowl (3 plats)
- Poke bowl Saumon - 16.50€
- Poke Bowl Spicy Crispy Chicken - 16.50€
- Poke Bowl Falafel - 15.50€

#### 🥗 Salades Repas (4 plats)
- Salade de chèvre chaud - 14.50€
- Salade césar - 14.50€
- Salade de poulpe - 15.50€
- Salade camembert - 16.00€

#### 👶 Menu Bambin (1 plat)
- Menu Bambin - 10.00€

### Fonctionnalités

- ✅ Recherche automatique du restaurant par nom (insensible à la casse)
- ✅ Détection des plats déjà existants (évite les doublons)
- ✅ Ajout uniquement des nouveaux plats
- ✅ Images automatiques depuis Unsplash
- ✅ Tous les plats sont marqués comme disponibles

### Réponse

```json
{
  "message": "Ajout de 14 plats au restaurant SMAASH BURGER",
  "restaurant": {
    "id": "<uuid>",
    "nom": "SMAASH BURGER"
  },
  "summary": {
    "total": 14,
    "success": 14,
    "errors": 0,
    "existing": 0
  },
  "results": [
    {
      "item": "Classic Smaash Burger",
      "status": "success",
      "id": "<uuid>"
    },
    ...
  ]
}
```

### Notes

- Si le restaurant n'existe pas, l'API retournera une erreur 404
- Si tous les plats existent déjà, l'API retournera un message informatif
- Les plats avec le même nom (insensible à la casse) ne seront pas ajoutés en double


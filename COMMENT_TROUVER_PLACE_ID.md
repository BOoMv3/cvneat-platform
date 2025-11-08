# 🔍 Comment trouver le Google Place ID d'un restaurant

## Méthode 1 : Via Google Maps (La plus simple) ⭐

### Étape 1 : Ouvrir Google Maps
1. Allez sur [Google Maps](https://www.google.com/maps)
2. Recherchez le nom du restaurant que vous voulez

### Étape 2 : Cliquer sur le restaurant
- Cliquez sur le restaurant dans les résultats de recherche
- OU cliquez directement sur le marqueur sur la carte

### Étape 3 : Récupérer le Place ID depuis l'URL
Une fois que la fiche du restaurant s'affiche, regardez l'URL dans votre navigateur :

```
https://www.google.com/maps/place/Nom+du+Restaurant/@48.8566,2.3522,15z/data=!4m5!3m4!1s0x47e66e1f06e2b70f:0x40b82c3758cce50!8m2!3d48.8566!4d2.3522
```

Le Place ID est la partie après `!1s` et avant `!8m2` ou `!3d` :

**Exemple :** `0x47e66e1f06e2b70f:0x40b82c3758cce50`

OU parfois il est directement dans l'URL :
```
https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4
```

Le Place ID est : `ChIJN1t_tDeuEmsRUsoyG83frY4`

---

## Méthode 2 : Via l'outil Place ID Finder de Google

### Étape 1 : Ouvrir l'outil
Allez sur : [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id#find-id)

### Étape 2 : Rechercher le restaurant
1. Entrez le nom du restaurant dans la barre de recherche
2. Sélectionnez le bon restaurant dans la liste déroulante

### Étape 3 : Copier le Place ID
Le Place ID s'affiche dans une boîte bleue. Copiez-le !

---

## Méthode 3 : Via Google Maps en mode développeur

### Étape 1 : Ouvrir Google Maps
1. Allez sur [Google Maps](https://www.google.com/maps)
2. Recherchez le restaurant

### Étape 2 : Ouvrir les outils de développement
1. Appuyez sur `F12` (ou clic droit > Inspecter)
2. Allez dans l'onglet **Console**

### Étape 3 : Exécuter une commande
Tapez cette commande dans la console :
```javascript
document.querySelector('[data-place-id]')?.getAttribute('data-place-id')
```

Le Place ID devrait s'afficher !

---

## Méthode 4 : Via l'API Google Places (pour développeurs)

Si vous avez une clé API, vous pouvez utiliser l'API de recherche :

```javascript
const searchQuery = "Nom du Restaurant, Adresse, Ville";
const apiKey = "VOTRE_CLE_API";

const response = await fetch(
  `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id&key=${apiKey}`
);

const data = await response.json();
console.log(data.candidates[0].place_id);
```

---

## ⚠️ Format du Place ID

Un Place ID Google ressemble généralement à :
- `ChIJN1t_tDeuEmsRUsoyG83frY4` (format court)
- `0x47e66e1f06e2b70f:0x40b82c3758cce50` (format long)

Les deux formats fonctionnent, mais préférez le format court (commence par `ChIJ`) si possible.

---
0x12b3f7342efb4ab3:0x6eb7a2fe100bcfc
## ✅ Vérifier que le Place ID est correct

Une fois que vous avez le Place ID, vous pouvez le tester en allant sur :
```
https://www.google.com/maps/place/?q=place_id:VOTRE_PLACE_ID
```

Si cela vous redirige vers le bon restaurant, c'est le bon Place ID !

---

## 💡 Astuce : Trouver plusieurs Place IDs rapidement

Si vous devez trouver plusieurs Place IDs :
1. Créez un fichier Excel/Google Sheets avec les noms et adresses des restaurants
2. Utilisez l'outil Place ID Finder de Google en masse
3. Ou utilisez un script Python/Node.js avec l'API Google Places

---

## 📝 Exemple concret

**Restaurant :** "Le Comptoir du 7ème"
**Adresse :** 8 Rue de Varenne, 75007 Paris

1. Allez sur Google Maps
2. Recherchez "Le Comptoir du 7ème Paris"
3. Cliquez sur le restaurant
4. Regardez l'URL : `https://www.google.com/maps/place/.../data=!4m5!3m4!1s0x47e66e1f06e2b70f:0x40b82c3758cce50!8m2...`
5. Le Place ID est : `0x47e66e1f06e2b70f:0x40b82c3758cce50`

OU utilisez l'outil Place ID Finder pour obtenir le format court : `ChIJ...`

---

## 🆘 Problèmes courants

**Q : Le Place ID ne fonctionne pas dans l'API**
- R : Vérifiez que vous utilisez bien le format complet (sans les `!` ou caractères spéciaux)
- Essayez de le récupérer à nouveau depuis l'outil officiel

**Q : Je ne trouve pas le restaurant**
- R : Assurez-vous que le restaurant existe bien sur Google Maps
- Essayez avec une adresse complète
- Vérifiez l'orthographe du nom

**Q : Le Place ID change-t-il ?**
- R : Non, le Place ID est permanent pour un lieu donné
- Il ne change que si le restaurant déménage ou ferme définitivement

---

Besoin d'aide ? Contactez le support ou consultez la [documentation officielle Google](https://developers.google.com/maps/documentation/places/web-service/place-id)


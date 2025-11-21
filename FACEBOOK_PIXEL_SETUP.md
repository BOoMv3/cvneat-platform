# Configuration du Pixel Facebook

## 📋 Qu'est-ce que le Pixel Facebook ?

Le Pixel Facebook (Meta Pixel) est un outil de suivi qui permet de :
- Mesurer l'efficacité de vos publicités Facebook/Instagram
- Créer des audiences pour le retargeting
- Optimiser automatiquement vos campagnes publicitaires
- Suivre les conversions (commandes, ajouts au panier, etc.)

## 🚀 Installation

### 1. Obtenir votre Pixel ID

1. Allez sur [Facebook Business Manager](https://business.facebook.com/)
2. Accédez à **Événements** > **Pixels**
3. Créez un nouveau pixel ou utilisez un pixel existant
4. Copiez votre **Pixel ID** (ex: `123456789012345`)

### 2. Configurer la variable d'environnement

Ajoutez votre Pixel ID dans votre fichier `.env.local` :

```env
NEXT_PUBLIC_FACEBOOK_PIXEL_ID=votre_pixel_id_ici
```

### 3. Redémarrer l'application

Après avoir ajouté la variable d'environnement, redémarrez votre application Next.js.

## 📊 Événements trackés automatiquement

Le pixel track automatiquement les événements suivants :

### ✅ PageView
- **Quand** : À chaque changement de page
- **Où** : Automatique via le composant `FacebookPixel`

### 🛒 AddToCart
- **Quand** : Quand un client ajoute un article au panier
- **Où** : `app/restaurants/[id]/page.js`
- **Données** : Nom, ID, prix, quantité de l'article

### 🛍️ InitiateCheckout
- **Quand** : Quand un client arrive sur la page de paiement
- **Où** : `app/checkout/page.js`
- **Données** : Montant total, nombre d'articles, contenu du panier

### 💰 Purchase
- **Quand** : Quand une commande est confirmée
- **Où** : `app/order-confirmation/[id]/page.js`
- **Données** : ID commande, montant total, articles commandés

### 🏪 ViewContent (Restaurant)
- **Quand** : Quand un client visite une page restaurant
- **Où** : `app/restaurants/[id]/page.js`
- **Données** : Nom, ID, catégorie du restaurant

### 🔍 Search
- **Quand** : Quand un client fait une recherche (après 1 seconde de debounce)
- **Où** : `app/page.js`
- **Données** : Terme de recherche

## 🔒 Respect du RGPD

Le pixel Facebook respecte automatiquement les préférences de cookies :
- Il ne se charge **que si** l'utilisateur a accepté les cookies marketing
- Vérifie les préférences stockées dans `cookieConsent`
- Désactivé par défaut si le consentement n'est pas donné

## 🧪 Tester le pixel

### 1. Vérifier que le pixel se charge

1. Ouvrez les **Outils de développement** (F12)
2. Allez dans l'onglet **Console**
3. Vous devriez voir : `fbq('init', 'VOTRE_PIXEL_ID')`

### 2. Vérifier les événements

1. Allez sur [Facebook Events Manager](https://business.facebook.com/events_manager2)
2. Sélectionnez votre pixel
3. Allez dans **Tester les événements**
4. Effectuez des actions sur votre site (ajouter au panier, commander, etc.)
5. Les événements devraient apparaître en temps réel

### 3. Utiliser Facebook Pixel Helper

Installez l'extension [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) pour Chrome :
- Elle vous indique si le pixel est correctement installé
- Elle affiche les événements trackés en temps réel
- Elle détecte les erreurs de configuration

## 📝 Notes importantes

- Le pixel ne fonctionne que si `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` est configuré
- Les événements sont automatiquement trackés, pas besoin de code supplémentaire
- Le pixel respecte les préférences de cookies de l'utilisateur
- Les données sont envoyées de manière sécurisée à Facebook

## 🐛 Dépannage

### Le pixel ne se charge pas
- Vérifiez que `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` est bien défini dans `.env.local`
- Vérifiez que le consentement marketing est accepté
- Vérifiez la console du navigateur pour les erreurs

### Les événements ne s'affichent pas
- Attendez quelques minutes (délai de traitement Facebook)
- Vérifiez que vous êtes bien connecté à Facebook Business Manager
- Utilisez Facebook Pixel Helper pour vérifier en temps réel

### Erreur "fbq is not defined"
- Le pixel n'est pas encore chargé, c'est normal au premier chargement
- Vérifiez que le composant `FacebookPixel` est bien dans le layout

## 📚 Documentation Facebook

- [Documentation officielle du Pixel Facebook](https://developers.facebook.com/docs/meta-pixel)
- [Guide des événements standard](https://developers.facebook.com/docs/meta-pixel/reference)
- [Facebook Events Manager](https://business.facebook.com/events_manager2)




# 📊 Guide : Vérifier les Logs APNs

## 🔍 Où Voir les Logs ?

Les logs s'affichent dans le **terminal** où vous avez lancé `npm run dev`.

## 📱 Comment Vérifier

### 1. Trouver le Terminal

Le terminal où vous avez lancé `npm run dev` devrait afficher quelque chose comme :

```bash
$ npm run dev

> cvneat-pages@1.0.0 dev
> next dev

  ▲ Next.js 14.0.4
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

### 2. Chercher les Messages APNs

**Regardez dans le terminal** pour ces messages :

#### ✅ Si c'est BON (Configuration réussie) :

Vous devriez voir :
```
✅ Provider APNs créé avec succès
```

**Quand apparaît ce message ?**
- Au démarrage du serveur (si le module `lib/apns.js` est chargé)
- OU la première fois qu'une notification iOS est envoyée

#### ❌ Si c'est MAUVAIS (Configuration manquante) :

Vous verrez :
```
❌ Configuration APNs manquante. Vérifiez les variables d'environnement :
   - APNS_KEY_ID: ✅ ou ❌
   - APNS_TEAM_ID: ✅ ou ❌
   - APNS_BUNDLE_ID: ✅ ou ❌
   - APNS_KEY_CONTENT: ✅ ou ❌
```

## 🧪 Tester la Configuration

### Méthode 1 : Vérifier au Démarrage

1. **Arrêter le serveur** : `Ctrl + C` dans le terminal
2. **Relancer** : `npm run dev`
3. **Regarder les logs** au démarrage

### Méthode 2 : Tester l'Envoi d'une Notification

1. **Ouvrir l'app iOS** sur votre iPhone
2. **Se connecter** en tant que livreur ou restaurant
3. **Créer une commande** depuis le site web
4. **Regarder les logs** dans le terminal

Vous devriez voir :
```
✅ Provider APNs créé avec succès
✅ Notification APNs envoyée avec succès à ABC123...
```

OU si erreur :
```
❌ Erreur envoi push iOS: [message d'erreur]
```

## 🔍 Exemples de Logs

### Exemple 1 : Configuration Correcte

```bash
$ npm run dev

> cvneat-pages@1.0.0 dev
> next dev

  ▲ Next.js 14.0.4
  - Local:        http://localhost:3000
  - Ready in 2.3s

✅ Provider APNs créé avec succès
```

### Exemple 2 : Configuration Manquante

```bash
$ npm run dev

> cvneat-pages@1.0.0 dev
> next dev

  ▲ Next.js 14.0.4
  - Local:        http://localhost:3000
  - Ready in 2.3s

❌ Configuration APNs manquante. Vérifiez les variables d'environnement :
   - APNS_KEY_ID: ❌
   - APNS_TEAM_ID: ❌
   - APNS_BUNDLE_ID: ❌
   - APNS_KEY_CONTENT: ❌
```

### Exemple 3 : Envoi de Notification Réussi

```bash
POST /api/notifications/send-push 200 in 234ms
✅ Provider APNs créé avec succès
✅ Notification APNs envoyée avec succès à ABC123XYZ...
```

### Exemple 4 : Erreur d'Envoi

```bash
POST /api/notifications/send-push 200 in 234ms
❌ Erreur envoi push iOS: Invalid token
```

## 🐛 Si Vous Ne Voyez Aucun Message

### Cas 1 : Le module n'est pas encore chargé

**Normal** : Le message `✅ Provider APNs créé avec succès` n'apparaît que quand :
- Une notification iOS est envoyée pour la première fois
- OU le module `lib/apns.js` est importé

**Solution** : Tester en envoyant une notification (créer une commande depuis l'app)

### Cas 2 : Le serveur n'a pas redémarré

**Solution** :
1. Arrêter le serveur : `Ctrl + C`
2. Relancer : `npm run dev`
3. Vérifier les logs

### Cas 3 : Les variables ne sont pas chargées

**Vérifier** :
1. Le fichier `.env.local` existe bien à la racine
2. Les variables sont bien nommées (sans fautes)
3. Pas d'espaces autour du `=`

**Tester** : Ajouter temporairement dans `lib/apns.js` :
```javascript
console.log('🔍 DEBUG APNs:', {
  keyId: process.env.APNS_KEY_ID ? '✅' : '❌',
  teamId: process.env.APNS_TEAM_ID ? '✅' : '❌',
  bundleId: process.env.APNS_BUNDLE_ID ? '✅' : '❌',
  keyContent: process.env.APNS_KEY_CONTENT ? '✅' : '❌'
});
```

## 📸 Où Regarder dans VS Code

Si vous utilisez VS Code :

1. **Ouvrir le terminal intégré** :
   - Menu : `Terminal` → `New Terminal`
   - OU raccourci : `` Ctrl + ` `` (backtick)

2. **Lancer le serveur** :
   ```bash
   npm run dev
   ```

3. **Les logs apparaîtront** dans ce terminal

## ✅ Checklist de Vérification

- [ ] Le terminal est ouvert et visible
- [ ] Le serveur est lancé (`npm run dev`)
- [ ] Je vois les logs Next.js (version, URL locale)
- [ ] J'ai vérifié s'il y a des messages `✅` ou `❌` concernant APNs
- [ ] Si pas de message, j'ai testé en envoyant une notification

## 🎯 Prochaine Étape

Une fois que vous voyez `✅ Provider APNs créé avec succès`, la configuration est correcte !

Si vous voyez des erreurs, dites-moi exactement quel message apparaît et je vous aiderai à corriger.


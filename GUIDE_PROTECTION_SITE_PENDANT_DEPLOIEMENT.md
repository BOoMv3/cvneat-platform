# 🔒 Guide : Protéger le site pendant le déploiement

## 🎯 Objectif
Empêcher l'accès public au site sur votre domaine jusqu'à ce que vous soyez prêt.

## ✅ Solutions possibles

### Option 1 : Password Protection (Recommandé - Le plus simple)

**Dans Vercel Dashboard :**
1. Allez dans **Settings > Deployment Protection**
2. Activez **"Password Protection"**
3. Entrez un mot de passe
4. Sauvegardez

**Avantages :**
- ✅ Le site est accessible mais protégé par mot de passe
- ✅ Vous pouvez tester le site vous-même avec le mot de passe
- ✅ Facile à activer/désactiver
- ✅ Les clients ne peuvent pas accéder sans le mot de passe

**Quand vous êtes prêt :**
- Désactivez simplement le "Password Protection" dans Vercel

---

### Option 2 : Retirer temporairement les domaines

**Dans Vercel Dashboard :**
1. Allez dans **Settings > Domains**
2. Cliquez sur **"Edit"** à côté de `www.cvneat.fr`
3. Cliquez sur **"Remove"** ou **"Delete"**
4. Répétez pour `cvneat.fr`

**Quand vous êtes prêt :**
- Reconnectez les domaines dans Vercel
- Les certificats SSL seront régénérés automatiquement

**Inconvénients :**
- ⚠️ Il faudra reconfigurer les DNS
- ⚠️ Il faudra attendre la génération du certificat SSL à nouveau

---

### Option 3 : Page de maintenance

**Créer une page de maintenance :**
1. Créez un fichier `app/maintenance/page.js` avec un message "Site en construction"
2. Modifiez `next.config.js` pour rediriger toutes les routes vers `/maintenance` en mode développement
3. Ou utilisez un middleware pour rediriger selon une variable d'environnement

**Avantages :**
- ✅ Message personnalisé pour les visiteurs
- ✅ Contrôle total sur le contenu affiché

**Inconvénients :**
- ⚠️ Plus complexe à mettre en place
- ⚠️ Nécessite un déploiement

---

### Option 4 : Utiliser un sous-domaine de test

**Alternative :**
1. Gardez `cvneat-platform.vercel.app` pour les tests
2. Ne connectez `cvneat.fr` que quand vous êtes prêt

**Avantages :**
- ✅ Le domaine principal n'est pas encore accessible
- ✅ Vous pouvez tester sur `cvneat-platform.vercel.app`

---

## 🎯 Recommandation

**Pour votre cas, je recommande l'Option 1 (Password Protection)** car :
- C'est le plus simple et rapide
- Vous pouvez tester le site vous-même
- Facile à activer/désactiver
- Pas besoin de reconfigurer quoi que ce soit

**Étapes :**
1. Allez dans Vercel > Settings > Deployment Protection
2. Activez "Password Protection"
3. Entrez un mot de passe (ex: "cvneat2024")
4. Sauvegardez
5. Testez : Allez sur `www.cvneat.fr` → Vous devrez entrer le mot de passe
6. Quand vous êtes prêt : Désactivez le Password Protection

---

## 📝 Note importante

**Même avec Password Protection activé :**
- Les certificats SSL continuent de se générer
- Les DNS restent configurés
- Vous pouvez tester le site en toute sécurité
- Quand vous désactivez la protection, le site sera immédiatement accessible publiquement

**Astuce :**
Vous pouvez aussi activer la protection seulement pour l'environnement Production, et laisser les autres environnements (Preview, Development) sans protection pour vos tests.


# 🔐 Dépannage - Problèmes d'authentification CVN'EAT

## ❌ **PROBLÈME IDENTIFIÉ :**

Quand vous essayez d'accéder aux pages **admin**, **partenaire** ou **livreur**, vous êtes redirigé vers la page d'accueil ou la page ne fonctionne pas.

## 🔍 **CAUSE RACINE :**

Le problème vient de la **vérification des rôles** qui est trop stricte ou mal configurée dans le code.

### **Problèmes identifiés :**

1. **Vérification des rôles incorrecte** : Le code vérifiait `.includes('partner')` au lieu de `=== 'restaurant'`
2. **Vérification des rôles admin** : Le code vérifiait `.split(',').includes('admin')` au lieu de `=== 'admin'`
3. **Page de livraison sans authentification** : Aucune vérification des rôles
4. **Structure de base de données** : Les rôles sont simples (`'user', 'admin', 'restaurant', 'delivery'`)

## ✅ **SOLUTIONS APPLIQUÉES :**

### **1. Correction des vérifications de rôles :**

```javascript
// ❌ AVANT (incorrect)
if (userData.role !== 'restaurant') // ou .includes('partner')

// ✅ APRÈS (correct)
if (userData.role !== 'restaurant')
```

### **2. Ajout de l'authentification à la page de livraison :**

```javascript
// Vérification du rôle livreur
if (userData.role !== 'delivery') {
  setAuthError('Accès refusé. Seuls les livreurs peuvent accéder à cette page.');
  return;
}
```

### **3. Ajout de logs de débogage :**

```javascript
console.log('Rôle utilisateur:', userData?.role, 'Attendu: restaurant');
```

## 🧪 **TEST DE LA SOLUTION :**

### **Étape 1 : Vérifier votre rôle actuel**

1. Allez sur votre page de profil ou connectez-vous
2. Vérifiez dans la console du navigateur (F12) quel est votre rôle
3. Le rôle doit être exactement : `'admin'`, `'restaurant'`, `'delivery'` ou `'user'`

### **Étape 2 : Créer des comptes de test**

Utilisez le script `create-test-accounts.js` pour créer des comptes avec les bons rôles :

```bash
# 1. Installer les dépendances
npm install @supabase/supabase-js

# 2. Configurer vos clés Supabase dans le script
# 3. Exécuter le script
node create-test-accounts.js
```

### **Étape 3 : Tester les différents rôles**

| Rôle | Email | Mot de passe | Page d'accès |
|------|-------|---------------|---------------|
| 👑 **ADMIN** | `admin@cvneat.com` | `admin123` | `/admin` |
| 🍕 **PARTENAIRE** | `restaurant@cvneat.com` | `restaurant123` | `/partner` |
| 🚚 **LIVREUR** | `livreur@cvneat.com` | `livreur123` | `/delivery` |
| 👤 **CLIENT** | `client@cvneat.com` | `client123` | `/` (accueil) |

## 🔧 **VÉRIFICATIONS TECHNIQUES :**

### **1. Structure de la table `users` :**

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    email VARCHAR(255),
    role VARCHAR(20) CHECK (role IN ('user', 'admin', 'restaurant', 'delivery')),
    -- autres champs...
);
```

### **2. Vérification des rôles dans le code :**

```javascript
// ✅ CORRECT pour chaque page
// Page admin
if (userData.role !== 'admin') { /* accès refusé */ }

// Page partenaire
if (userData.role !== 'restaurant') { /* accès refusé */ }

// Page livreur
if (userData.role !== 'delivery') { /* accès refusé */ }
```

## 🚨 **PROBLÈMES COURANTS :**

### **1. Rôle mal défini :**
- Vérifiez que votre utilisateur a le bon rôle dans la base de données
- Le rôle doit être exactement : `'admin'`, `'restaurant'`, `'delivery'` ou `'user'`

### **2. Session expirée :**
- Reconnectez-vous si votre session a expiré
- Vérifiez que vous êtes bien connecté avant d'accéder aux pages protégées

### **3. Problème de base de données :**
- Vérifiez que la table `users` existe et contient vos données
- Vérifiez que le champ `role` est bien rempli

## 📱 **TEST RAPIDE :**

1. **Connectez-vous** avec un des comptes de test
2. **Allez directement** sur la page correspondante :
   - `/admin` pour admin@cvneat.com
   - `/partner` pour restaurant@cvneat.com
   - `/delivery` pour livreur@cvneat.com
3. **Vérifiez** que vous n'êtes pas redirigé

## 🆘 **SI LE PROBLÈME PERSISTE :**

1. **Vérifiez la console** du navigateur (F12) pour les erreurs
2. **Vérifiez les logs** du serveur
3. **Vérifiez votre rôle** dans la base de données Supabase
4. **Contactez le support** avec les logs d'erreur

## 🎯 **RÉSULTAT ATTENDU :**

Après ces corrections, vous devriez pouvoir :
- ✅ Accéder à `/admin` avec un compte `admin`
- ✅ Accéder à `/partner` avec un compte `restaurant`
- ✅ Accéder à `/delivery` avec un compte `delivery`
- ✅ Être redirigé vers l'accueil si vous n'avez pas le bon rôle
- ✅ Voir des messages d'erreur clairs si l'accès est refusé

---

**💡 Conseil :** Testez toujours avec les comptes de test avant d'utiliser vos vrais comptes ! 
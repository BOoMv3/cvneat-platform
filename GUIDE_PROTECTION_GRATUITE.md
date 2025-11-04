# 🔒 Guide : Protéger le site GRATUITEMENT pendant le déploiement

## ⚠️ Note
La fonctionnalité "Password Protection" de Vercel nécessite le plan Pro + Advanced Deployment Protection (150$/mois). Voici des alternatives **GRATUITES**.

---

## ✅ Solution 1 : Retirer temporairement les domaines (Le plus simple)

**Dans Vercel Dashboard :**
1. Allez dans **Settings > Domains**
2. Cliquez sur **"Edit"** à côté de `www.cvneat.fr`
3. Cliquez sur **"Remove"** ou **"Delete"**
4. Répétez pour `cvneat.fr`

**Résultat :**
- ✅ Le site reste accessible sur `cvneat-platform.vercel.app` pour vos tests
- ✅ `www.cvneat.fr` et `cvneat.fr` ne pointeront plus vers votre site
- ✅ Gratuit et instantané

**Quand vous êtes prêt :**
1. Reconnectez les domaines dans Vercel
2. Les certificats SSL seront régénérés automatiquement
3. Attendez quelques minutes pour la propagation

---

## ✅ Solution 2 : Page de maintenance avec middleware (Recommandé)

Cette solution permet d'afficher une page "Site en construction" pour tous les visiteurs, sauf vous.

### Étape 1 : Créer la page de maintenance

Créez `app/maintenance/page.js` :

```javascript
export default function Maintenance() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Site en construction</h1>
        <p className="text-xl text-gray-600">
          CVN'EAT sera bientôt disponible !
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Nous travaillons dur pour vous offrir la meilleure expérience.
        </p>
      </div>
    </div>
  );
}
```

### Étape 2 : Créer le middleware

Créez `middleware.js` à la racine du projet :

```javascript
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Vérifier si le mode maintenance est activé
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  
  // Si le mode maintenance est activé ET que ce n'est pas la page de maintenance elle-même
  if (isMaintenanceMode && !request.nextUrl.pathname.startsWith('/maintenance')) {
    // Rediriger vers la page de maintenance
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Étape 3 : Configurer la variable d'environnement

**Dans Vercel Dashboard :**
1. Allez dans **Settings > Environment Variables**
2. Ajoutez une nouvelle variable :
   - **Key** : `NEXT_PUBLIC_MAINTENANCE_MODE`
   - **Value** : `true`
   - **Environments** : Production (et Preview si vous voulez)
3. Cliquez sur **"Save"**

**Résultat :**
- ✅ Tous les visiteurs voient la page "Site en construction"
- ✅ Vous pouvez tester sur `cvneat-platform.vercel.app` (si vous ne l'activez pas pour Preview)
- ✅ Gratuit et facile à activer/désactiver

**Quand vous êtes prêt :**
1. Changez `NEXT_PUBLIC_MAINTENANCE_MODE` à `false` dans Vercel
2. Déployez ou attendez le prochain déploiement
3. Le site sera accessible normalement

---

## ✅ Solution 3 : Utiliser un sous-domaine de test

**Alternative simple :**
1. Gardez `cvneat-platform.vercel.app` pour les tests
2. Ne connectez `cvneat.fr` que quand vous êtes prêt à rendre le site public

**Avantages :**
- ✅ Le domaine principal n'est pas encore accessible publiquement
- ✅ Vous pouvez tester sur le domaine Vercel
- ✅ Pas de protection nécessaire, juste ne pas connecter le domaine

---

## 🎯 Recommandation pour votre cas

**Je recommande la Solution 1 (Retirer temporairement les domaines)** car :
- ✅ C'est le plus simple et rapide
- ✅ Aucun code à modifier
- ✅ Gratuit et instantané
- ✅ Vous pouvez reconnecter les domaines quand vous êtes prêt

**Étapes :**
1. Retirez `www.cvneat.fr` et `cvneat.fr` de Vercel maintenant
2. Testez sur `cvneat-platform.vercel.app`
3. Quand vous êtes prêt, reconnectez les domaines
4. Attendez la génération du certificat SSL (5-15 minutes)

**OU** si vous voulez garder les domaines connectés mais protéger l'accès :

**Utilisez la Solution 2 (Page de maintenance)** :
- Créez le middleware et la page de maintenance
- Activez `NEXT_PUBLIC_MAINTENANCE_MODE=true`
- Les visiteurs verront "Site en construction"
- Vous pouvez tester en désactivant temporairement la variable

---

## 📝 Note importante

**Avec les Solutions 1 et 3 :**
- Les visiteurs ne peuvent pas accéder au site via votre domaine
- Le site reste accessible sur `cvneat-platform.vercel.app` pour vos tests

**Avec la Solution 2 :**
- Les visiteurs voient une page de maintenance
- Vous pouvez personnaliser le message
- Facile à activer/désactiver via une variable d'environnement

Quelle solution préférez-vous utiliser ?


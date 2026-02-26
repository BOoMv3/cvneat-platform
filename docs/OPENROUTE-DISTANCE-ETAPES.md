# OpenRouteService – Distance réelle par la route (étape par étape)

On utilise OpenRouteService pour avoir la **distance réelle en voiture** entre le restaurant (Ganges) et l’adresse du client, au lieu de la distance à vol d’oiseau.

---

## Étape 1 : Créer un compte et récupérer la clé API

1. Va sur **https://openrouteservice.org**
2. Clique sur **「 Sign up / Log in 」** (ou **「 Developer 」** puis inscription)
3. Tu arrives sur **https://account.heigit.org** (HeiGIT = hébergeur de l’API)
   - Crée un compte (email + mot de passe)
   - Valide ton email si demandé
4. Une fois connecté, ouvre **「 API Keys 」** ou **「 Dashboard 」**
5. **Crée une clé API** (Create API key / Generate key)
6. **Copie la clé** et garde-la précieusement (elle ressemble à une longue chaîne ou à un JWT qui commence par `eyJ...`)

---

## Étape 2 : Ajouter la clé dans ton projet

1. Ouvre le fichier **`.env.local`** à la racine du projet (s’il n’existe pas, crée-le en copiant `.env.example` s’il existe, sinon crée un fichier vide nommé `.env.local`).
2. Ajoute **une seule ligne** (remplace `TA_CLE_ICI` par ta vraie clé) :

   ```env
   OPENROUTE_API_KEY=TA_CLE_ICI
   ```

3. **Ne commite jamais ce fichier** dans Git (`.env.local` est normalement déjà dans `.gitignore`).
4. En **production** (Vercel, etc.) : va dans **Settings → Environment Variables**, ajoute la variable **`OPENROUTE_API_KEY`** avec la même valeur.

---

## Étape 3 : Redémarrer le serveur

1. Arrête le serveur Next.js (Ctrl+C dans le terminal).
2. Relance-le : `npm run dev` (ou `yarn dev`).
3. Les variables d’environnement sont lues au démarrage ; sans redémarrage, `OPENROUTE_API_KEY` ne sera pas prise en compte.

---

## Étape 4 : Comportement de l’appli

- Dès que **`OPENROUTE_API_KEY`** est définie, le calcul de livraison utilise la **distance par la route** (API OpenRouteService) pour :
  - **Refuser** la livraison si la distance route **> 10 km**
  - Afficher cette **distance route** (en km) dans la réponse et les logs
- Si la clé est **absente** ou que l’API **échoue** (quota, réseau, etc.), le code utilise en secours la **distance à vol d’oiseau** (Haversine) comme avant, avec une limite à 8 km (équivalent ~10 km route).

---

## Récap

| Étape | Action |
|-------|--------|
| 1 | Compte sur account.heigit.org → créer une clé API |
| 2 | Mettre `OPENROUTE_API_KEY=ta_cle` dans `.env.local` et en prod |
| 3 | Redémarrer le serveur |
| 4 | Tester une adresse de livraison : la distance affichée doit être la distance route |

**Quota gratuit :** 2 000 requêtes / jour, 40 / minute. Suffisant pour des centaines de commandes par jour.

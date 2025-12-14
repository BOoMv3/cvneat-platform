# 📧 Guide : Éviter que les emails aillent dans les indésirables avec Brevo

## ⚠️ Problème
Les emails envoyés via Brevo arrivent dans le dossier indésirables (spam) au lieu de la boîte de réception.

## ✅ Solutions

### 1. **Authentifier votre domaine dans Brevo (OBLIGATOIRE)**

C'est la solution la plus importante ! Vous devez authentifier votre domaine `cvneat.fr` dans Brevo.

#### Étapes :

1. **Connectez-vous à Brevo** : https://app.brevo.com
2. **Allez dans** : **Paramètres** → **Domaines** → **Ajouter un domaine**
3. **Entrez votre domaine** : `cvneat.fr`
4. **Brevo vous donnera des enregistrements DNS à ajouter** :
   - **SPF** (TXT record)
   - **DKIM** (TXT record)
   - **DMARC** (TXT record - optionnel mais recommandé)

5. **Ajoutez ces enregistrements dans votre hébergeur DNS** (là où vous gérez cvneat.fr) :
   - Connectez-vous à votre hébergeur (OVH, Gandi, Cloudflare, etc.)
   - Allez dans la gestion DNS de `cvneat.fr`
   - Ajoutez les enregistrements TXT fournis par Brevo
   - Attendez 24-48h pour la propagation DNS

6. **Vérifiez dans Brevo** : Une fois les DNS propagés, Brevo vérifiera automatiquement l'authentification

### 2. **Utiliser une adresse email avec votre domaine**

✅ **Déjà fait** : Vous utilisez `contact@cvneat.fr` ce qui est parfait !

❌ **À éviter** : N'utilisez JAMAIS une adresse Gmail, Yahoo, Outlook pour envoyer des newsletters.

### 3. **Améliorer le contenu des emails**

#### ✅ À FAIRE :
- Éviter les mots en majuscules excessives
- Éviter trop de points d'exclamation (!!!)
- Équilibrer texte et images
- Ajouter un lien de désinscription clair
- Utiliser un sujet clair et descriptif

#### ❌ À ÉVITER :
- Mots déclencheurs : "GRATUIT", "OFFRE LIMITÉE", "CLIQUEZ ICI", "URGENT"
- Trop d'emojis dans le sujet
- Sujets en majuscules

### 4. **Ajouter un lien de désinscription**

Tous les emails doivent contenir un lien de désinscription visible.

### 5. **Construire votre réputation d'expéditeur**

- Commencez par envoyer à un petit nombre d'utilisateurs
- Surveillez les taux d'ouverture et de clics
- Nettoyez régulièrement votre liste (supprimez les emails invalides)
- Répondez aux plaintes de spam rapidement

## 🔧 Configuration DNS recommandée

### SPF (Sender Policy Framework)
```
Type: TXT
Nom: @ (ou cvneat.fr)
Valeur: v=spf1 include:spf.brevo.com ~all
```

### DKIM
Brevo vous donnera une clé DKIM unique à ajouter.

### DMARC (Recommandé)
```
Type: TXT
Nom: _dmarc
Valeur: v=DMARC1; p=quarantine; rua=mailto:contact@cvneat.fr
```

## 📝 Vérification

Après avoir configuré les DNS :

1. **Vérifiez dans Brevo** : Le statut du domaine doit être "Vérifié" ✅
2. **Testez l'envoi** : Envoyez un email de test à votre propre adresse
3. **Vérifiez les en-têtes** : L'email doit avoir les en-têtes SPF, DKIM validés

## 🚨 Si les emails vont toujours en spam

1. **Vérifiez les en-têtes de l'email** :
   - Ouvrez l'email dans votre client email
   - Affichez les en-têtes complets
   - Vérifiez que SPF et DKIM sont "PASS"

2. **Contactez Brevo** : Leur support peut vous aider à diagnostiquer le problème

3. **Vérifiez votre réputation** :
   - https://mxtoolbox.com/blacklists.aspx
   - Entrez votre IP d'envoi ou domaine
   - Vérifiez que vous n'êtes pas sur une liste noire

## 📚 Ressources

- Documentation Brevo : https://help.brevo.com/hc/fr/articles/209467485
- Guide SPF/DKIM/DMARC : https://help.brevo.com/hc/fr/articles/209467485


# 🔍 Diagnostic Publicités - Pourquoi elles ne s'affichent pas

## ✅ Conditions requises pour qu'une publicité s'affiche

Une publicité doit remplir **TOUTES** ces conditions :

### 1. **is_active = true**
- La publicité doit être activée
- Vérifier dans Supabase : `advertisements.is_active = true`

### 2. **Statut valide**
La publicité doit avoir l'un de ces statuts :
- `status = 'approved'` ✅
- `status = 'active'` ✅
- `status = 'pending_approval'` **ET** `payment_status = 'paid'` ✅

### 3. **Dates valides**
- `start_date` : Si défini, doit être <= aujourd'hui
- `end_date` : Si défini, doit être >= aujourd'hui
- Si aucune date n'est définie, la publicité est toujours valide

### 4. **Image présente**
- `image_url` doit être rempli et valide

### 5. **Position correspondante**
- `position` doit correspondre à la position demandée :
  - `banner_middle` : Au milieu de la page
  - `footer` : En bas de page

---

## 🔧 Comment vérifier dans Supabase

### 1. Vérifier les publicités existantes

```sql
SELECT 
  id,
  title,
  position,
  is_active,
  status,
  payment_status,
  start_date,
  end_date,
  image_url,
  created_at
FROM advertisements
ORDER BY created_at DESC;
```

### 2. Vérifier les publicités valides pour une position

```sql
SELECT 
  id,
  title,
  position,
  is_active,
  status,
  payment_status,
  start_date,
  end_date,
  image_url,
  CASE 
    WHEN is_active = false THEN '❌ is_active = false'
    WHEN status NOT IN ('approved', 'active') AND NOT (status = 'pending_approval' AND payment_status = 'paid') THEN '❌ Statut invalide'
    WHEN start_date > CURRENT_DATE THEN '❌ Date de début dans le futur'
    WHEN end_date < CURRENT_DATE THEN '❌ Date de fin dépassée'
    WHEN image_url IS NULL OR image_url = '' THEN '❌ Image manquante'
    ELSE '✅ Publicité valide'
  END as diagnostic
FROM advertisements
WHERE position = 'banner_middle' -- ou 'footer'
ORDER BY created_at DESC;
```

### 3. Activer une publicité

```sql
-- Mettre le statut à 'approved' et activer
UPDATE advertisements
SET 
  is_active = true,
  status = 'approved'
WHERE id = 'ID_DE_LA_PUB';
```

### 4. Vérifier les dates

```sql
-- Vérifier les dates pour aujourd'hui
SELECT 
  id,
  title,
  start_date,
  end_date,
  CURRENT_DATE as aujourdhui,
  CASE 
    WHEN start_date IS NULL OR start_date <= CURRENT_DATE THEN '✅ Date début OK'
    ELSE '❌ Date début dans le futur'
  END as check_start,
  CASE 
    WHEN end_date IS NULL OR end_date >= CURRENT_DATE THEN '✅ Date fin OK'
    ELSE '❌ Date fin dépassée'
  END as check_end
FROM advertisements
WHERE is_active = true;
```

---

## 🐛 Problèmes courants

### Problème 1 : "Aucune publicité valide trouvée"
**Causes possibles :**
- `is_active = false` → Mettre à `true`
- `status` n'est pas `approved` ou `active` → Changer le statut
- Dates hors période → Vérifier `start_date` et `end_date`
- `image_url` manquante → Ajouter une image

### Problème 2 : "Publicité hors période"
**Causes possibles :**
- `start_date` est dans le futur → Mettre une date passée ou aujourd'hui
- `end_date` est dans le passé → Mettre une date future

### Problème 3 : Publicité ne s'affiche pas à la bonne position
**Causes possibles :**
- `position` ne correspond pas → Vérifier que `position = 'banner_middle'` ou `'footer'`

---

## ✅ Checklist rapide

Pour qu'une publicité s'affiche, vérifier :

- [ ] `is_active = true` dans Supabase
- [ ] `status = 'approved'` ou `'active'` (ou `'pending_approval'` avec `payment_status = 'paid'`)
- [ ] `start_date` <= aujourd'hui (ou NULL)
- [ ] `end_date` >= aujourd'hui (ou NULL)
- [ ] `image_url` est rempli
- [ ] `position` correspond (`banner_middle` ou `footer`)

---

## 🚀 Solution rapide

Si tu veux afficher une publicité immédiatement :

```sql
UPDATE advertisements
SET 
  is_active = true,
  status = 'approved',
  start_date = CURRENT_DATE,
  end_date = CURRENT_DATE + INTERVAL '30 days'
WHERE id = 'ID_DE_TA_PUB';
```

---

## 📍 Où sont affichées les publicités ?

- **banner_middle** : Au milieu de la page d'accueil, entre les catégories et les restaurants
- **footer** : En bas de la page d'accueil

Ces positions sont définies dans `app/page.js` aux lignes 1130 et 1336.


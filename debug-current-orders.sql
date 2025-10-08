-- Script pour déboguer les commandes en cours de livraison

-- 1. Vérifier s'il y a des commandes avec statut 'en_livraison'
SELECT 
  id,
  statut,
  livreur_id,
  restaurant_id,
  total,
  created_at,
  updated_at
FROM commandes 
WHERE statut = 'en_livraison'
ORDER BY created_at DESC;

-- 2. Vérifier s'il y a des commandes assignées à des livreurs
SELECT 
  id,
  statut,
  livreur_id,
  restaurant_id,
  total,
  created_at,
  updated_at
FROM commandes 
WHERE livreur_id IS NOT NULL
ORDER BY created_at DESC;

-- 3. Vérifier les livreurs existants
SELECT 
  id,
  email,
  role,
  prenom,
  nom
FROM users 
WHERE role = 'delivery'
ORDER BY created_at DESC;

-- 4. Vérifier la structure de la table commandes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'commandes' 
  AND column_name IN ('statut', 'livreur_id', 'restaurant_id')
ORDER BY ordinal_position;

-- 5. Tester la requête complète comme dans l'API
SELECT 
  c.*,
  r.nom as restaurant_nom,
  r.adresse as restaurant_adresse,
  r.telephone as restaurant_telephone,
  r.frais_livraison,
  u.prenom,
  u.nom,
  u.telephone as user_telephone
FROM commandes c
LEFT JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN users u ON c.user_id = u.id
WHERE c.statut = 'en_livraison'
  AND c.livreur_id IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 1;

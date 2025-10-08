-- SCRIPT POUR VÉRIFIER UNE COMMANDE SPÉCIFIQUE
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER SI LA COMMANDE EXISTE (AVEC SERVICE ROLE)
-- Cette requête devrait fonctionner même avec RLS
SELECT 
  id,
  restaurant_id,
  statut,
  total,
  created_at,
  updated_at
FROM commandes 
WHERE id = 'f8d76690-de88-4618-8e21-ae2b5232891f';

-- 2. VÉRIFIER TOUTES LES COMMANDES RÉCENTES
SELECT 
  id,
  restaurant_id,
  statut,
  total,
  created_at
FROM commandes 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. VÉRIFIER LE RESTAURANT ASSOCIÉ
SELECT 
  id,
  nom,
  user_id
FROM restaurants
WHERE id = '4572cee6-1fc6-4f32-b007-57c46871ec70';

-- 4. VÉRIFIER LES COMMANDES DE CE RESTAURANT
SELECT 
  id,
  statut,
  total,
  created_at
FROM commandes 
WHERE restaurant_id = '4572cee6-1fc6-4f32-b007-57c46871ec70'
ORDER BY created_at DESC 
LIMIT 5;

-- 5. VÉRIFIER LES PERMISSIONS RLS
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'commandes';

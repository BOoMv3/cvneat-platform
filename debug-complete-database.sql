-- DIAGNOSTIC COMPLET DE LA BASE DE DONNÉES
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER QUE TOUTES LES TABLES EXISTENT
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. VÉRIFIER LA STRUCTURE DE LA TABLE COMMANDES
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'commandes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. VÉRIFIER LA STRUCTURE DE LA TABLE RESTAURANTS
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. VÉRIFIER LA STRUCTURE DE LA TABLE USERS
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. COMPTER LES DONNÉES EXISTANTES
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'restaurants' as table_name, COUNT(*) as count FROM restaurants
UNION ALL
SELECT 'commandes' as table_name, COUNT(*) as count FROM commandes
UNION ALL
SELECT 'details_commande' as table_name, COUNT(*) as count FROM details_commande
UNION ALL
SELECT 'menus' as table_name, COUNT(*) as count FROM menus;

-- 6. VÉRIFIER LES RESTAURANTS ET LEURS UTILISATEURS
SELECT 
  r.id as restaurant_id,
  r.nom as restaurant_nom,
  r.user_id,
  u.email as user_email,
  u.role as user_role
FROM restaurants r
LEFT JOIN users u ON r.user_id = u.id
ORDER BY r.created_at DESC;

-- 7. VÉRIFIER LES COMMANDES EXISTANTES
SELECT 
  c.id as commande_id,
  c.restaurant_id,
  c.user_id,
  c.statut,
  c.total,
  c.adresse_livraison,
  c.created_at,
  r.nom as restaurant_nom
FROM commandes c
LEFT JOIN restaurants r ON c.restaurant_id = r.id
ORDER BY c.created_at DESC;

-- 8. CRÉER UNE COMMANDE DE TEST COMPLÈTE
-- D'abord, vérifier qu'un restaurant existe
SELECT id, nom, user_id FROM restaurants WHERE nom = 'Restaurant Test' LIMIT 1;

-- Si le restaurant existe, créer une commande de test
INSERT INTO commandes (
  restaurant_id,
  statut,
  total,
  frais_livraison,
  adresse_livraison,
  created_at
) VALUES (
  (SELECT id FROM restaurants WHERE nom = 'Restaurant Test' LIMIT 1),
  'en_attente',
  25.99,
  2.50,
  '123 Rue de Test, 34000 Montpellier',
  NOW()
) RETURNING id, created_at;

-- 9. VÉRIFIER QUE LA COMMANDE A ÉTÉ CRÉÉE
SELECT 
  c.id,
  c.restaurant_id,
  c.statut,
  c.total,
  c.adresse_livraison,
  c.created_at,
  r.nom as restaurant_nom
FROM commandes c
JOIN restaurants r ON c.restaurant_id = r.id
WHERE r.nom = 'Restaurant Test'
ORDER BY c.created_at DESC
LIMIT 5;

-- Script de débogage complet pour vérifier les commandes
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier toutes les tables qui contiennent des commandes
SELECT 'commandes' as table_name, COUNT(*) as count FROM commandes
UNION ALL
SELECT 'orders' as table_name, COUNT(*) as count FROM orders
UNION ALL
SELECT 'details_commande' as table_name, COUNT(*) as count FROM details_commande
UNION ALL
SELECT 'order_items' as table_name, COUNT(*) as count FROM order_items;

-- 2. Vérifier la structure de la table commandes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'commandes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Vérifier toutes les commandes existantes
SELECT 
  c.id,
  c.user_id,
  c.restaurant_id,
  c.statut,
  c.total,
  c.frais_livraison,
  c.adresse_livraison,
  c.created_at,
  r.nom as restaurant_nom
FROM commandes c
LEFT JOIN restaurants r ON c.restaurant_id = r.id
ORDER BY c.created_at DESC;

-- 4. Vérifier spécifiquement les commandes pour le restaurant "Restaurant Test"
SELECT 
  c.id,
  c.user_id,
  c.restaurant_id,
  c.statut,
  c.total,
  c.frais_livraison,
  c.adresse_livraison,
  c.created_at,
  r.nom as restaurant_nom,
  r.id as restaurant_id_raw
FROM commandes c
JOIN restaurants r ON c.restaurant_id = r.id
WHERE r.id = '4572cee6-1fc6-4f32-b007-57c46871ec70'
ORDER BY c.created_at DESC;

-- 5. Vérifier si le restaurant existe bien
SELECT 
  id,
  user_id,
  nom,
  adresse,
  is_active
FROM restaurants 
WHERE id = '4572cee6-1fc6-4f32-b007-57c46871ec70';

-- 6. Créer une commande de test simple
INSERT INTO commandes (
  restaurant_id,
  statut,
  total,
  frais_livraison,
  adresse_livraison,
  created_at
) VALUES (
  '4572cee6-1fc6-4f32-b007-57c46871ec70',
  'en_attente',
  15.99,
  2.50,
  'Test Adresse, 34000 Montpellier',
  NOW()
) RETURNING id, created_at;

-- 7. Vérifier que la commande a été créée
SELECT 
  c.id,
  c.restaurant_id,
  c.statut,
  c.total,
  c.created_at,
  r.nom as restaurant_nom
FROM commandes c
JOIN restaurants r ON c.restaurant_id = r.id
WHERE r.id = '4572cee6-1fc6-4f32-b007-57c46871ec70'
ORDER BY c.created_at DESC
LIMIT 3;

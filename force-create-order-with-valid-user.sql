-- Script qui force la création avec un utilisateur valide
-- À exécuter dans Supabase SQL Editor

-- 1. D'abord, supprimer la commande de test si elle existe
DELETE FROM orders WHERE id = 999;

-- 2. Vérifier les utilisateurs disponibles
SELECT 
  'Utilisateurs disponibles' as info,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
ORDER BY created_at DESC;

-- 3. Créer un livreur de test avec un ID spécifique
INSERT INTO users (
  id,
  email,
  nom,
  prenom,
  telephone,
  adresse,
  code_postal,
  ville,
  role,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111', -- ID fixe pour éviter les conflits
  'livreur.test@example.com',
  'Livreur',
  'Test',
  '0123456789',
  '123 Rue du Test',
  '75001',
  'Paris',
  'delivery',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nom = EXCLUDED.nom,
  prenom = EXCLUDED.prenom,
  role = EXCLUDED.role;

-- 4. Vérifier que le livreur existe
SELECT 
  'Livreur créé' as info,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE id = '11111111-1111-1111-1111-111111111111';

-- 5. Créer la commande avec l'ID fixe
INSERT INTO orders (
  id,
  customer_name,
  customer_phone,
  delivery_address,
  delivery_city,
  delivery_postal_code,
  items,
  total_amount,
  delivery_fee,
  status,
  restaurant_id,
  delivery_id,
  preparation_time,
  security_code,
  created_at,
  updated_at
) VALUES (
  999,
  'Client Test Alerte',
  '0123456789',
  '123 Rue de Test',
  'Paris',
  '75001',
  '[{"name": "Pizza Test", "price": 15.00, "quantity": 1}]',
  15.00,
  3.00,
  'preparing',
  (SELECT id FROM restaurants LIMIT 1),
  '11111111-1111-1111-1111-111111111111', -- ID fixe du livreur
  15,
  '123456',
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '10 minutes'
);

-- 6. Vérifier la commande créée
SELECT 
  'Commande créée avec succès' as info,
  id,
  customer_name,
  status,
  preparation_time,
  total_amount,
  delivery_id,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed
FROM orders 
WHERE id = 999;

-- Script SQL corrigé pour créer une commande de test
-- À exécuter dans Supabase SQL Editor

-- D'abord, vérifier la structure de la table orders
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- Créer une commande de test avec statut 'pending'
INSERT INTO orders (
  customer_id,
  restaurant_id,
  status,
  customer_name,
  customer_phone,
  delivery_address,
  delivery_city,
  delivery_postal_code,
  delivery_instructions,
  items,
  total_amount,
  delivery_fee,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111', -- Client de test
  '7f1e0b5f-5552-445d-a582-306515030c8d', -- Restaurant de test
  'pending', -- Statut initial - déclenche l'alerte restaurant
  'Client Test',
  '0123456789',
  '123 Rue de Test, Paris',
  'Paris',
  '75001',
  'Sonner fort, 3ème étage',
  '[
    {
      "name": "Pizza Margherita",
      "price": 12.50,
      "quantity": 1
    },
    {
      "name": "Coca Cola",
      "price": 2.50,
      "quantity": 2
    }
  ]'::jsonb,
  17.50,
  3.00,
  NOW(),
  NOW()
);

-- Vérifier que la commande a été créée
SELECT 
  id,
  status,
  customer_name,
  total_amount,
  delivery_fee,
  restaurant_id,
  created_at
FROM orders 
WHERE customer_name = 'Client Test'
ORDER BY created_at DESC
LIMIT 1;

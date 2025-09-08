-- Créer un restaurant de test
-- À exécuter dans Supabase SQL Editor

-- 1. Créer un restaurant de test
INSERT INTO restaurants (
  id,
  nom,
  adresse,
  telephone,
  email,
  description,
  image_url,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Restaurant Test CVN''Eat',
  '123 Rue de la Test, 75001 Paris',
  '01 23 45 67 89',
  'test@restaurant-cvneat.com',
  'Restaurant de test pour la plateforme CVN''Eat',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 2. Vérifier que le restaurant a été créé
SELECT 
  id,
  nom,
  adresse,
  telephone,
  email
FROM restaurants 
WHERE email = 'test@restaurant-cvneat.com';

-- 3. Créer des plats de test pour ce restaurant
-- (Vous devrez adapter selon votre structure de table des plats)
-- INSERT INTO menu_items (
--   restaurant_id,
--   name,
--   description,
--   price,
--   category,
--   is_available
-- ) VALUES (
--   (SELECT id FROM restaurants WHERE email = 'test@restaurant-cvneat.com'),
--   'Pizza Margherita',
--   'Pizza classique avec tomate, mozzarella et basilic',
--   12.50,
--   'Pizza',
--   true
-- );

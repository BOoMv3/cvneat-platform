-- Script pour créer des données de test
-- À exécuter dans Supabase SQL Editor

-- Insérer des restaurants de test
INSERT INTO public.restaurants (id, name, address, city, is_active, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'La Bella Pizza', '123 Rue de la Paix', 'Paris', true, NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Burger King', '456 Avenue des Champs', 'Lyon', true, NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Sushi Tokyo', '789 Boulevard Saint-Germain', 'Marseille', false, NOW());

-- Insérer des commandes de test
INSERT INTO public.orders (id, user_id, restaurant_id, total_amount, status, created_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 25.50, 'pending', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 18.90, 'accepted', NOW() - INTERVAL '1 hour'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 42.00, 'delivered', NOW() - INTERVAL '2 hours'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 15.75, 'rejected', NOW() - INTERVAL '3 hours'); 
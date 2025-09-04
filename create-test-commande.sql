-- Créer une commande de test avec le statut 'livree'
-- À exécuter dans Supabase SQL Editor

-- D'abord, créer un client de test s'il n'existe pas
INSERT INTO users (id, nom, prenom, email, telephone, adresse, code_postal, ville, role, created_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Client',
  'Test',
  'client@test.com',
  '0123456789',
  '123 Rue Client',
  '75001',
  'Paris',
  'customer',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insérer une commande de test
INSERT INTO commandes (
  user_id,
  restaurant_id,
  statut,
  montant_total,
  frais_livraison,
  adresse_livraison,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  (SELECT id FROM restaurants LIMIT 1),
  'livree',
  25.50,
  3.50,
  '123 Rue de Test, Paris',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
);

-- Vérifier les commandes créées
SELECT 
  id,
  statut,
  montant_total,
  frais_livraison,
  user_id,
  restaurant_id,
  adresse_livraison
FROM commandes
ORDER BY created_at DESC
LIMIT 5;
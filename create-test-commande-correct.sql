-- Script corrigé pour créer une commande de test
-- Basé sur la structure réelle de votre base de données

-- 1. D'abord, vérifier la structure de la table commandes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'commandes' 
ORDER BY ordinal_position;

-- 2. Utiliser un utilisateur existant au lieu d'en créer un nouveau
-- Récupérer l'ID d'un utilisateur existant avec le rôle 'user'
SELECT id, email, role FROM users WHERE role = 'user' LIMIT 1;

-- 3. Récupérer l'ID d'un restaurant existant
SELECT id, nom FROM restaurants LIMIT 1;

-- 4. Insérer une commande de test en utilisant les IDs existants
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
  (SELECT id FROM users WHERE role = 'user' LIMIT 1),
  (SELECT id FROM restaurants LIMIT 1),
  'livree',
  25.50,
  3.50,
  '123 Rue de Test, Paris',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
);

-- 5. Vérifier que la commande a été créée
SELECT 
  id,
  statut,
  montant_total,
  frais_livraison,
  user_id,
  restaurant_id,
  adresse_livraison,
  created_at
FROM commandes
ORDER BY created_at DESC
LIMIT 5;

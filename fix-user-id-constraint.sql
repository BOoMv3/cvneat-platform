-- Script pour corriger la contrainte user_id NOT NULL
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer la contrainte NOT NULL sur user_id
ALTER TABLE commandes ALTER COLUMN user_id DROP NOT NULL;

-- 2. Ajouter un commentaire pour expliquer pourquoi user_id peut être NULL
COMMENT ON COLUMN commandes.user_id IS 'ID de l''utilisateur client. Peut être NULL pour les commandes sans compte client.';

-- 3. Vérifier la structure mise à jour
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'commandes' 
AND table_schema = 'public'
AND column_name = 'user_id';

-- 4. Maintenant créer une commande de test
INSERT INTO commandes (
  id,
  user_id,
  restaurant_id,
  statut,
  total,
  frais_livraison,
  adresse_livraison,
  created_at
) VALUES (
  gen_random_uuid(),
  NULL, -- Maintenant autorisé
  '4572cee6-1fc6-4f32-b007-57c46871ec70', -- Restaurant Test
  'en_attente',
  25.50,
  2.50,
  '123 Rue de Test, 34000 Montpellier',
  NOW()
);

-- 5. Vérifier que la commande a été créée
SELECT 
  c.id,
  c.user_id,
  c.restaurant_id,
  c.statut,
  c.total,
  c.adresse_livraison,
  c.created_at,
  r.nom as restaurant_nom
FROM commandes c
JOIN restaurants r ON c.restaurant_id = r.id
WHERE r.id = '4572cee6-1fc6-4f32-b007-57c46871ec70'
ORDER BY c.created_at DESC
LIMIT 5;

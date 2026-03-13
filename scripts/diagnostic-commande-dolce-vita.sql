-- Diagnostic commande Dolce Vita
-- À exécuter dans Supabase SQL Editor pour voir les commandes récentes de Dolce Vita

-- 1) Trouver le restaurant Dolce Vita
SELECT id, nom, user_id FROM restaurants WHERE nom ILIKE '%dolce%vita%' OR nom ILIKE '%dolcevita%';

-- 2) Commandes récentes Dolce Vita (adapter l'ID du restaurant si besoin)
-- Remplacer RESTAURANT_ID par l'ID trouvé ci-dessus
SELECT 
  c.id,
  c.created_at,
  c.statut,
  c.payment_status,
  c.livreur_id,
  c.restaurant_id,
  r.nom as restaurant_nom
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE r.nom ILIKE '%dolce%' 
  OR r.nom ILIKE '%dolcevita%'
ORDER BY c.created_at DESC
LIMIT 20;

-- 3) Causes possibles si le livreur n'arrive pas à accepter:
--    - statut doit être 'en_attente'
--    - payment_status doit être 'paid' ou 'succeeded'
--    - livreur_id doit être NULL

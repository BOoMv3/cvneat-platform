-- Diagnostic : livraisons potentiellement manquantes pour Dany
-- À exécuter dans Supabase SQL Editor (bloc par bloc).

-- 1) Id de Dany
SELECT id AS dany_id, email, prenom, nom
FROM users
WHERE role IN ('delivery', 'livreur')
  AND (prenom ILIKE '%dany%' OR nom ILIKE '%galliard%' OR email ILIKE '%dany%')
LIMIT 1;

-- 2) Récap actuel pour Dany (ce qui est compté aujourd'hui)
WITH dany AS (
  SELECT id FROM users
  WHERE role IN ('delivery', 'livreur') AND (prenom ILIKE '%dany%' OR nom ILIKE '%galliard%')
  LIMIT 1
)
SELECT
  COUNT(*) AS nb_livraisons_a_payer,
  ROUND(SUM(c.frais_livraison - COALESCE(c.delivery_commission_cvneat, 0))::numeric, 2) AS gains_dus_eur
FROM commandes c, dany
WHERE c.livreur_id = dany.id
  AND c.statut = 'livree'
  AND c.livreur_paid_at IS NULL
  AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL);

-- 3) Commandes livrées SANS livreur assigné (orphans) — candidats à attribuer à Dany si ce sont les siennes
SELECT c.id, c.created_at, c.restaurant_id, r.nom AS restaurant, c.total, c.frais_livraison,
       ROUND((c.frais_livraison - COALESCE(c.delivery_commission_cvneat, 0))::numeric, 2) AS gain_livreur_eur
FROM commandes c
LEFT JOIN restaurants r ON r.id = c.restaurant_id
WHERE c.statut = 'livree'
  AND c.livreur_id IS NULL
  AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
ORDER BY c.created_at DESC
LIMIT 20;

-- 4) Pour attribuer 1 ou 2 de ces commandes à Dany : remplacer LES_UUID_ICI par les vrais id (colonne id du bloc 3)
-- UPDATE commandes
-- SET livreur_id = (SELECT id FROM users WHERE role IN ('delivery', 'livreur') AND (prenom ILIKE '%dany%' OR nom ILIKE '%galliard%') LIMIT 1)
-- WHERE id IN ('uuid-commande-1', 'uuid-commande-2');

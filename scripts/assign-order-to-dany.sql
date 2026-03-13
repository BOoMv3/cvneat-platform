-- Attribuer la commande 240e1748-e735-43fd-b121-7843b7f0b89b au livreur Dany
-- Exécuter dans Supabase → SQL Editor

UPDATE commandes
SET livreur_id = (
  SELECT id FROM users
  WHERE role IN ('delivery', 'livreur')
  AND (prenom ILIKE 'dany%' OR (prenom ILIKE '%dany%' AND nom ILIKE '%gall%'))
  LIMIT 1
)
WHERE id = '240e1748-e735-43fd-b121-7843b7f0b89b';

-- Vérification
SELECT c.id, c.statut, c.livreur_id, u.prenom, u.nom, u.email
FROM commandes c
LEFT JOIN users u ON u.id = c.livreur_id
WHERE c.id = '240e1748-e735-43fd-b121-7843b7f0b89b';

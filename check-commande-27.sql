-- Vérifier toutes les commandes existantes
SELECT 
  id,
  statut,
  montant_total,
  frais_livraison,
  user_id,
  restaurant_id,
  adresse_livraison,
  created_at,
  updated_at
FROM commandes 
ORDER BY created_at DESC
LIMIT 5;

-- Vérifier tous les statuts existants
SELECT statut, COUNT(*) as count 
FROM commandes 
GROUP BY statut;

-- Mettre à jour la première commande pour qu'elle soit "livree"
UPDATE commandes 
SET statut = 'livree', 
    frais_livraison = 3.50,
    montant_total = 25.50
WHERE id = (SELECT id FROM commandes LIMIT 1);

-- Vérifier la mise à jour
SELECT 
  id,
  statut,
  montant_total,
  frais_livraison
FROM commandes 
WHERE statut = 'livree';

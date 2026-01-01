-- Migration pour ajouter la commission CVN'EAT sur les livraisons
-- Date: 2025-01-02
-- 
-- Logique:
-- - Si frais_livraison = 2.50€ → commission = 0€ (livreur garde 2.50€)
-- - Si frais_livraison > 2.50€ → commission = (frais_livraison - 2.50) * pourcentage (10% par défaut)
-- - Le livreur reçoit toujours: frais_livraison - delivery_commission_cvneat (minimum 2.50€ garanti)

-- Ajouter la colonne pour stocker la commission CVN'EAT sur la livraison
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS delivery_commission_cvneat DECIMAL(10,2) DEFAULT 0.00;

-- Ajouter un commentaire pour la documentation
COMMENT ON COLUMN commandes.delivery_commission_cvneat IS 'Commission CVN''EAT prélevée sur les frais de livraison (0€ si livraison = 2.50€, sinon pourcentage sur la partie > 2.50€)';

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_commandes_delivery_commission ON commandes(delivery_commission_cvneat);

-- Mettre à jour les commandes existantes avec commission = 0 (pas de commission rétroactive)
UPDATE commandes
SET delivery_commission_cvneat = 0.00
WHERE delivery_commission_cvneat IS NULL;


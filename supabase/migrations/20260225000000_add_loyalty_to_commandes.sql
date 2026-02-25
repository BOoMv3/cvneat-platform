-- Colonnes fidélité sur la commande : pour informer le partenaire des points utilisés par le client
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS loyalty_points_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_discount_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN commandes.loyalty_points_used IS 'Nombre de points fidélité utilisés par le client sur cette commande';
COMMENT ON COLUMN commandes.loyalty_discount_amount IS 'Montant de la réduction appliquée (1 pt = 1€)';

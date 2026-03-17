-- Colonnes utilisées par l'API de création de paiement livreur (admin)
-- Si la table a été créée sans ces colonnes, l'insert échouait avec "Erreur lors de la création du paiement"

ALTER TABLE delivery_transfers
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS orders_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN delivery_transfers.created_by IS 'Admin ayant enregistré le virement';
COMMENT ON COLUMN delivery_transfers.orders_count IS 'Nombre de courses payées par ce virement';
COMMENT ON COLUMN delivery_transfers.order_ids IS 'IDs des commandes payées par ce virement (pour détail facture)';

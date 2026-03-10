-- Détail des courses par virement livreur (pour facture pro)
ALTER TABLE delivery_transfers
  ADD COLUMN IF NOT EXISTS orders_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN delivery_transfers.orders_count IS 'Nombre de courses payées par ce virement';
COMMENT ON COLUMN delivery_transfers.order_ids IS 'IDs des commandes payées par ce virement (pour détail facture)';

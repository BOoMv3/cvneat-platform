-- Réduction promo plateforme (ex. 2e article -50 %), distincte de discount_amount (codes + fidélité)
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS platform_discount_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN commandes.platform_discount_amount IS 'Réduction promo plateforme appliquée au paiement (hors discount_amount restaurant / codes / fidélité).';

-- Subvention CVN'EAT pour récompense fidélité « article offert » (reversement partenaire / compta)
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS loyalty_article_subsidy_eur DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN commandes.loyalty_article_subsidy_eur IS 'Montant forfaitaire ajouté au reversement restaurant pour couvrir dessert/boisson offert (programme fidélité)';

-- Attestation client majeur si le panier contient de l''alcool (case à cocher checkout)
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS alcohol_legal_age_declared BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS alcohol_legal_age_declared_at TIMESTAMPTZ;

COMMENT ON COLUMN commandes.alcohol_legal_age_declared IS 'Client a attesté être majeur pour commande avec articles alcoolisés';
COMMENT ON COLUMN commandes.alcohol_legal_age_declared_at IS 'Horodatage de l''attestation (si déclarée)';

-- Marquage menu : bière, vin, etc. (obligatoire pour activer contrôle checkout)
ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS contains_alcohol BOOLEAN DEFAULT false;

COMMENT ON COLUMN menus.contains_alcohol IS 'Article avec alcool : le client devra attester sa majorité au paiement';

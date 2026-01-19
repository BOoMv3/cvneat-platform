-- Ajout des informations légales restaurants + génération d'une facture par virement
-- Objectif: permettre des documents comptables "1 virement = 1 facture/relevé" numérotés

-- 1) Infos légales côté restaurant (à renseigner par le restaurant ou l'admin)
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS vat_number TEXT;

COMMENT ON COLUMN restaurants.legal_name IS 'Raison sociale (facturation) du restaurant';
COMMENT ON COLUMN restaurants.siret IS 'SIRET du restaurant';
COMMENT ON COLUMN restaurants.vat_number IS 'TVA intracommunautaire du restaurant (si applicable)';

-- 2) Facture / relevé associé(e) à chaque virement restaurant
ALTER TABLE restaurant_transfers
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_html TEXT;

COMMENT ON COLUMN restaurant_transfers.invoice_number IS 'Numéro de facture généré au moment du virement';
COMMENT ON COLUMN restaurant_transfers.invoice_generated_at IS 'Date de génération de la facture/relevé';
COMMENT ON COLUMN restaurant_transfers.invoice_html IS 'HTML imprimable (archive) généré au moment du virement';

-- 3) Génération d'un numéro de facture simple (séquence globale)
-- Format: FAC-YYYY-000001
CREATE SEQUENCE IF NOT EXISTS restaurant_invoice_seq;

CREATE OR REPLACE FUNCTION next_restaurant_invoice_number(p_date DATE)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  y TEXT;
  n BIGINT;
BEGIN
  y := to_char(COALESCE(p_date, CURRENT_DATE), 'YYYY');
  n := nextval('restaurant_invoice_seq');
  RETURN 'FAC-' || y || '-' || lpad(n::text, 6, '0');
END;
$$;



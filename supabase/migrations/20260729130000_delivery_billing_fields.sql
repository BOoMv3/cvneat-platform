-- Infos facturation livreur (complément)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS vat_number TEXT,
  ADD COLUMN IF NOT EXISTS code_postal TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT;

COMMENT ON COLUMN users.vat_number IS 'N° TVA intracommunautaire livreur (optionnel)';
COMMENT ON COLUMN users.code_postal IS 'Code postal facturation livreur';
COMMENT ON COLUMN users.ville IS 'Ville facturation livreur';

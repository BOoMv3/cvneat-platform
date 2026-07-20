-- Suspension temporaire des comptes (livreurs / utilisateurs)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS suspension_penalty_eur NUMERIC(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.users.suspended_until IS 'Fin de la suspension temporaire (NULL = pas suspendu)';
COMMENT ON COLUMN public.users.suspension_reason IS 'Motif affiché à la prochaine tentative de connexion';
COMMENT ON COLUMN public.users.suspension_penalty_eur IS 'Pénalité financière déduite des gains livreur';

-- Recherche livreur avant paiement
ALTER TABLE public.commandes
  ADD COLUMN IF NOT EXISTS driver_search_status TEXT,
  ADD COLUMN IF NOT EXISTS driver_search_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_search_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_search_last_push_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_reserved_at TIMESTAMPTZ;

COMMENT ON COLUMN public.commandes.driver_search_status IS
  'null | searching | reserved | expired | cancelled — recherche livreur avant paiement';

CREATE INDEX IF NOT EXISTS idx_commandes_driver_searching
  ON public.commandes (driver_search_status, driver_search_expires_at)
  WHERE driver_search_status = 'searching';

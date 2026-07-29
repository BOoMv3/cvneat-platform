-- Infos KBIS livreur (URL document justificatif)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS kbis_url TEXT;

COMMENT ON COLUMN public.users.kbis_url IS 'URL du KBIS / extrait Kbis téléversé par le livreur pour facturation';

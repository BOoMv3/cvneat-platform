-- S'assurer que ferme_manuellement a pour défaut false (éviter bascules intempestives)
ALTER TABLE public.restaurants
  ALTER COLUMN ferme_manuellement SET DEFAULT false;

-- Optionnel : remettre à false les lignes où c'est NULL (cohérence)
UPDATE public.restaurants
  SET ferme_manuellement = false
  WHERE ferme_manuellement IS NULL;

COMMENT ON COLUMN public.restaurants.ferme_manuellement IS 'true = fermé manuellement par le partenaire/admin. Ne pas écrire depuis d''autres flux (ex. prep_time).';

-- Fermeture manuelle : Le Cinq Pizza Shop + 99 Street Food
-- À exécuter dans Supabase SQL Editor si besoin (les scripts service_role sont bloqués par trigger).

UPDATE public.restaurants
SET
  ferme_manuellement = true,
  ouvert_manuellement = false,
  updated_at = timezone('utc', now())
WHERE nom ILIKE '%cinq%pizza%'
   OR nom ILIKE '%99%street%';

SELECT id, nom, ferme_manuellement, ouvert_manuellement
FROM public.restaurants
WHERE nom ILIKE '%cinq%pizza%'
   OR nom ILIKE '%99%street%';

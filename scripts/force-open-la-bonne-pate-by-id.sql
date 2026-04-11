-- La Bonne Pâte — ouvrir en base (projet Supabase utilisé par www.cvneat.fr)
-- IMPORTANT : exécuter dans Supabase → SQL Editor (session sans JWT service_role).
-- Les mises à jour service_role sur ferme_manuellement peuvent être bloquées par trg_block_service_role_manual_close.
-- La preuve manual_status_* est requise par trigger_enforce_manual_status_change_proof.

UPDATE public.restaurants
SET
  ferme_manuellement = false,
  ouvert_manuellement = false,
  manual_status_updated_at = now(),
  manual_status_updated_by = user_id,
  updated_at = now()
WHERE id = 'd6725fe6-59ec-413a-b39b-ddb960824999';

SELECT id, nom, ferme_manuellement, ouvert_manuellement, manual_status_updated_at, user_id
FROM public.restaurants
WHERE id = 'd6725fe6-59ec-413a-b39b-ddb960824999';

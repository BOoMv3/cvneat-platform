-- Durcissement: seuls le propriétaire (users.id = restaurants.user_id) ou un admin
-- peuvent changer ferme_manuellement / ouvert_manuellement.
-- Et uniquement via une requête authentifiée (JWT sub présent).

CREATE OR REPLACE FUNCTION public.enforce_manual_status_change_proof()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_changed boolean;
  proof_ok boolean;
  actor_sub text;
  actor_id uuid;
  actor_role text;
  is_admin boolean;
  is_owner boolean;
BEGIN
  status_changed :=
    (OLD.ferme_manuellement IS DISTINCT FROM NEW.ferme_manuellement)
    OR (OLD.ouvert_manuellement IS DISTINCT FROM NEW.ouvert_manuellement);

  IF NOT status_changed THEN
    RETURN NEW;
  END IF;

  -- Exiger une requête authentifiée (pas de service role / scripts invisibles)
  actor_sub := current_setting('request.jwt.claim.sub', true);
  IF actor_sub IS NULL OR length(actor_sub) = 0 THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Changement de statut manuel refusé: JWT sub manquant',
      HINT = 'Le changement doit venir d''un utilisateur authentifié (dashboard partenaire/admin).';
  END IF;

  actor_id := actor_sub::uuid;

  proof_ok :=
    NEW.manual_status_updated_at IS NOT NULL
    AND NEW.manual_status_updated_by IS NOT NULL
    AND (OLD.manual_status_updated_at IS DISTINCT FROM NEW.manual_status_updated_at
         OR OLD.manual_status_updated_by IS DISTINCT FROM NEW.manual_status_updated_by)
    AND NEW.manual_status_updated_at >= (now() - interval '10 minutes')
    AND NEW.manual_status_updated_by = actor_id;

  IF NOT proof_ok THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Changement de statut manuel refusé: preuve invalide',
      HINT = 'manual_status_updated_by doit correspondre au JWT sub et manual_status_updated_at doit être récent.';
  END IF;

  SELECT u.role INTO actor_role FROM public.users u WHERE u.id = actor_id;
  is_admin := actor_role = 'admin';
  is_owner := NEW.user_id = actor_id;

  IF NOT (is_admin OR is_owner) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Changement de statut manuel refusé: acteur non autorisé',
      HINT = 'Seul le propriétaire du restaurant ou un admin peut ouvrir/fermer.';
  END IF;

  RETURN NEW;
END;
$$;


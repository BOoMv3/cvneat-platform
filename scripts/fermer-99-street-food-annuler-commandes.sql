-- Fermer 99 Street Food et annuler UNIQUEMENT les commandes de CE SOIR encore en attente (pas tout l'historique)
-- Le partenaire a oublié de se mettre fermé → on ferme le resto et on annule seulement les 3 commandes en_attente de ce soir.
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Fermer le restaurant (ferme_manuellement = true)
UPDATE restaurants
SET ferme_manuellement = true, updated_at = NOW()
WHERE nom ILIKE '%99 street%'
   OR nom ILIKE '%99street%'
   OR nom ILIKE '%99 street food%';

-- ÉTAPE 2: Lister les commandes qui VONT être annulées (uniquement en_attente, créées aujourd'hui)
SELECT c.id, c.created_at, c.statut, c.payment_status, c.total,
       (u.prenom || ' ' || u.nom) as client, u.email
FROM commandes c
JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN users u ON c.user_id = u.id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND c.statut = 'en_attente'
  AND (c.created_at AT TIME ZONE 'Europe/Paris')::date = (NOW() AT TIME ZONE 'Europe/Paris')::date
ORDER BY c.created_at DESC;

-- ÉTAPE 3: Annuler UNIQUEMENT les commandes en_attente de CE SOIR (99 Street Food)
DO $$
DECLARE
    id_99_street UUID;
    nb_updated INT;
BEGIN
    SELECT id INTO id_99_street
    FROM restaurants
    WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%'
    LIMIT 1;

    IF id_99_street IS NULL THEN
        RAISE EXCEPTION 'Restaurant 99 Street Food non trouvé - aucune commande modifiée';
    END IF;

    UPDATE commandes
    SET statut = 'annulee',
        payment_status = CASE
            WHEN payment_status IN ('paid', 'succeeded') THEN 'refunded'
            ELSE 'cancelled'
        END,
        updated_at = NOW()
    WHERE restaurant_id = id_99_street
      AND statut = 'en_attente'
      AND (created_at AT TIME ZONE 'Europe/Paris')::date = (NOW() AT TIME ZONE 'Europe/Paris')::date;

    GET DIAGNOSTICS nb_updated = ROW_COUNT;
    RAISE NOTICE '99 Street Food fermé. % commande(s) en attente de ce soir annulée(s).', nb_updated;
END $$;

-- ÉTAPE 4: Vérification finale
SELECT 
    r.nom as restaurant,
    r.ferme_manuellement,
    r.ouvert_manuellement,
    r.updated_at as restaurant_updated_at
FROM restaurants r
WHERE r.nom ILIKE '%99 street%'
   OR r.nom ILIKE '%99street%'
   OR r.nom ILIKE '%99 street food%';

-- Résumé des commandes annulées
SELECT 
    COUNT(*) as commandes_annulees
FROM commandes c
JOIN restaurants r ON c.restaurant_id = r.id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND c.statut = 'annulee';

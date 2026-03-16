-- Corriger : 1) Dany - dernière livraison Dolce Vita non comptabilisée dans ses gains
--            2) Dorian - vieille commande encore "en préparation" à annuler
-- À exécuter dans Supabase SQL Editor.

-- ========== DIAGNOSTIC ==========
-- 1) Livreurs Dany et Dorian
SELECT id AS livreur_id, email, prenom, nom, role
FROM users
WHERE (role IN ('delivery', 'livreur') AND (prenom ILIKE 'dany%' OR nom ILIKE '%galliard%' OR nom ILIKE '%legalliard%'))
   OR email ILIKE '%dorian%ledluz%';

-- 2) Restaurant Dolce Vita
SELECT id AS restaurant_id, nom FROM restaurants WHERE nom ILIKE '%dolce%vita%' OR nom ILIKE '%dolcevita%';

-- 3) Dernières commandes Dolce Vita avec livreur (pour trouver celle de Dany)
SELECT c.id, c.created_at, c.statut, c.livreur_id, c.frais_livraison, c.delivery_commission_cvneat, c.livreur_paid_at,
       r.nom AS restaurant, u.prenom || ' ' || u.nom AS livreur_nom, u.email AS livreur_email
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
LEFT JOIN users u ON u.id = c.livreur_id
WHERE (r.nom ILIKE '%dolce%vita%' OR r.nom ILIKE '%dolcevita%')
  AND c.payment_status IN ('paid', 'succeeded')
ORDER BY c.created_at DESC
LIMIT 15;

-- 4) Commandes de Dorian encore en préparation / en attente (vieux)
SELECT c.id, c.created_at, c.statut, c.restaurant_id, r.nom AS restaurant
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
JOIN users u ON u.id = c.livreur_id
WHERE u.email ILIKE '%dorian%ledluz%'
  AND c.statut IN ('en_preparation', 'en_attente')
ORDER BY c.created_at ASC;

-- ========== FIX DANY – Dernière livraison Dolce Vita comptabilisée ==========
-- Cas 1 : Commande déjà "livree" mais livreur_id vide (ex. annulation de masse) → remettre livreur_id = Dany
-- Cas 2 : Commande encore en_preparation / en_livraison → passer en livree + livreur_id = Dany
-- (On ne remet pas une commande "annulee" en livree sans vérifier le remboursement.)
DO $$
DECLARE
  id_dany UUID;
  id_dolce UUID;
  last_order_id UUID;
  cur_statut TEXT;
BEGIN
  SELECT id INTO id_dany FROM users WHERE role IN ('delivery', 'livreur') AND (prenom ILIKE 'dany%' OR nom ILIKE '%galliard%' OR nom ILIKE '%legalliard%') LIMIT 1;
  SELECT id INTO id_dolce FROM restaurants WHERE nom ILIKE '%dolce%vita%' OR nom ILIKE '%dolcevita%' LIMIT 1;

  IF id_dany IS NULL OR id_dolce IS NULL THEN
    RAISE NOTICE 'Dany ou Dolce Vita non trouvé. id_dany=%, id_dolce=%', id_dany, id_dolce;
    RETURN;
  END IF;

  -- Dernière commande Dolce Vita payée : livree sans livreur, ou encore en prépa/livraison (à finaliser pour Dany)
  SELECT c.id, c.statut INTO last_order_id, cur_statut
  FROM commandes c
  WHERE c.restaurant_id = id_dolce
    AND c.payment_status IN ('paid', 'succeeded')
    AND (
      (c.statut = 'livree' AND c.livreur_id IS NULL)
      OR (c.statut IN ('en_preparation', 'en_livraison') AND (c.livreur_id = id_dany OR c.livreur_id IS NULL))
    )
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF last_order_id IS NULL THEN
    -- Si la livraison avait été annulée par erreur : chercher dernière commande annulée Dolce Vita (à utiliser avec précaution)
    SELECT c.id INTO last_order_id
    FROM commandes c
    WHERE c.restaurant_id = id_dolce
      AND c.payment_status IN ('paid', 'succeeded')
      AND c.statut = 'annulee'
    ORDER BY c.created_at DESC
    LIMIT 1;
    IF last_order_id IS NOT NULL THEN
      RAISE NOTICE 'Dany / Dolce Vita : dernière commande trouvée est annulée (%). Pour la comptabiliser, décommenter le bloc "Optionnel annulee" en bas du script.', last_order_id;
    ELSE
      RAISE NOTICE 'Aucune commande Dolce Vita à corriger pour Dany.';
    END IF;
    RETURN;
  END IF;

  UPDATE commandes
  SET statut = 'livree',
      livreur_id = id_dany,
      delivery_commission_cvneat = COALESCE(delivery_commission_cvneat, 0),
      updated_at = NOW()
  WHERE id = last_order_id
    AND (statut IS DISTINCT FROM 'livree' OR livreur_id IS DISTINCT FROM id_dany OR delivery_commission_cvneat IS NULL);

  IF FOUND THEN
    RAISE NOTICE 'Dany / Dolce Vita : commande % mise à jour (livree, livreur_id=Dany).', last_order_id;
  ELSE
    RAISE NOTICE 'Dany / Dolce Vita : commande % déjà correcte.', last_order_id;
  END IF;
END $$;

-- ========== FIX DORIAN – Annuler la vieille commande encore en préparation ==========
-- Annuler les commandes Dorian en_preparation ou en_attente créées avant aujourd'hui (Paris)
DO $$
DECLARE
  id_dorian UUID;
  nb INT;
BEGIN
  SELECT id INTO id_dorian FROM users WHERE email ILIKE '%dorian%ledluz%' LIMIT 1;

  IF id_dorian IS NULL THEN
    RAISE NOTICE 'Dorian (dorian.ledluz) non trouvé.';
    RETURN;
  END IF;

  UPDATE commandes
  SET statut = 'annulee',
      livreur_id = NULL,
      payment_status = CASE WHEN payment_status IN ('paid', 'succeeded') THEN 'refunded' ELSE 'cancelled' END,
      updated_at = NOW()
  WHERE livreur_id = id_dorian
    AND statut IN ('en_preparation', 'en_attente')
    AND (created_at AT TIME ZONE 'Europe/Paris')::date < (NOW() AT TIME ZONE 'Europe/Paris')::date;

  GET DIAGNOSTICS nb = ROW_COUNT;
  RAISE NOTICE 'Dorian : % vieille(s) commande(s) annulée(s).', nb;
END $$;

-- ========== VÉRIFICATION ==========
-- Dany : commandes livrées pour Dolce Vita
SELECT c.id, c.statut, c.livreur_id, c.frais_livraison, c.delivery_commission_cvneat, c.livreur_paid_at, c.created_at
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
JOIN users u ON u.id = c.livreur_id
WHERE (u.prenom ILIKE 'dany%' OR u.nom ILIKE '%galliard%')
  AND (r.nom ILIKE '%dolce%vita%')
  AND c.statut = 'livree'
ORDER BY c.created_at DESC
LIMIT 5;

-- Dorian : plus de commande en préparation (sauf du jour)
SELECT c.id, c.statut, c.created_at, r.nom
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
JOIN users u ON u.id = c.livreur_id
WHERE u.email ILIKE '%dorian%ledluz%'
  AND c.statut IN ('en_preparation', 'en_attente');

-- ========== OPTIONNEL – Si la livraison Dany avait été annulée par erreur ==========
-- Décommenter et remplacer COMMANDE_ID par l'ID affiché dans le diagnostic ci-dessus.
-- UPDATE commandes
-- SET statut = 'livree', livreur_id = (SELECT id FROM users WHERE (prenom ILIKE 'dany%' OR nom ILIKE '%galliard%') AND role IN ('delivery','livreur') LIMIT 1),
--     delivery_commission_cvneat = COALESCE(delivery_commission_cvneat, 0), updated_at = NOW()
-- WHERE id = 'COMMANDE_ID' AND statut = 'annulee';

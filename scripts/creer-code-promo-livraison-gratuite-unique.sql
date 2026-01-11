-- Script pour créer un code promo à usage unique pour la livraison gratuite
-- Code valable une seule fois pour un seul client

-- Générer un code aléatoire unique (vous pouvez modifier le code si vous voulez un code spécifique)
DO $$
DECLARE
    v_code VARCHAR(50);
    v_promo_id UUID;
BEGIN
    -- Générer un code unique (8 caractères aléatoires)
    -- Vous pouvez aussi définir un code spécifique comme 'LIVRAISON0' par exemple
    v_code := UPPER('LIV' || SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 5));
    
    -- Vérifier que le code n'existe pas déjà
    WHILE EXISTS (SELECT 1 FROM promo_codes WHERE code = v_code) LOOP
        v_code := UPPER('LIV' || SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 5));
    END LOOP;
    
    -- Créer le code promo
    INSERT INTO promo_codes (
        code,
        description,
        discount_type,
        discount_value,
        min_order_amount,
        max_uses,              -- 1 seule utilisation totale
        max_uses_per_user,     -- 1 seule utilisation par utilisateur
        is_active,
        valid_from,
        valid_until
    ) VALUES (
        v_code,
        'Livraison gratuite - Code à usage unique',
        'free_delivery',
        0,
        0.01,                  -- Montant minimum très bas (presque aucun minimum)
        1,                     -- Usage unique (1 seule utilisation totale)
        1,                     -- 1 seule utilisation par client
        TRUE,
        NOW(),
        NULL                   -- Pas de date d'expiration (vous pouvez mettre une date si nécessaire)
    ) RETURNING id INTO v_promo_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Code promo créé avec succès !';
    RAISE NOTICE '   Code: %', v_code;
    RAISE NOTICE '   ID: %', v_promo_id;
    RAISE NOTICE '   Description: Livraison gratuite - Code à usage unique';
    RAISE NOTICE '   Type: free_delivery';
    RAISE NOTICE '   Utilisations maximum: 1 (total)';
    RAISE NOTICE '   Utilisations par client: 1';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Ce code ne peut être utilisé qu''UNE SEULE FOIS au total';
    RAISE NOTICE '⚠️  Un seul client pourra utiliser ce code';
    RAISE NOTICE '';
END $$;


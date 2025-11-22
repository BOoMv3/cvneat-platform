-- ========================================
-- SYSTÈME DE CODES PROMO POUR BOOSTER LES VENTES
-- ========================================

-- 1. Table des codes promo
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    -- Type de réduction
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_delivery')),
    discount_value DECIMAL(10,2) NOT NULL, -- Pourcentage (ex: 10) ou montant fixe (ex: 5.00)
    
    -- Conditions
    min_order_amount DECIMAL(10,2) DEFAULT 0, -- Montant minimum de commande
    max_discount_amount DECIMAL(10,2), -- Montant maximum de réduction (pour les pourcentages)
    
    -- Limites d'utilisation
    max_uses INTEGER, -- Nombre maximum d'utilisations totales
    max_uses_per_user INTEGER DEFAULT 1, -- Nombre maximum d'utilisations par utilisateur
    current_uses INTEGER DEFAULT 0, -- Nombre d'utilisations actuelles
    
    -- Dates de validité
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Restrictions
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE, -- NULL = tous les restaurants
    first_order_only BOOLEAN DEFAULT FALSE, -- Uniquement pour la première commande
    new_users_only BOOLEAN DEFAULT FALSE, -- Uniquement pour les nouveaux utilisateurs
    
    -- Statut
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Table pour suivre l'utilisation des codes promo
CREATE TABLE IF NOT EXISTS promo_code_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES commandes(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10,2) NOT NULL,
    order_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_user ON promo_code_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_code ON promo_code_usage(promo_code_id);

-- 4. Fonction pour valider un code promo
CREATE OR REPLACE FUNCTION validate_promo_code(
    p_code VARCHAR,
    p_user_id UUID,
    p_order_amount DECIMAL,
    p_restaurant_id UUID DEFAULT NULL,
    p_is_first_order BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    valid BOOLEAN,
    discount_amount DECIMAL,
    message TEXT,
    promo_code_id UUID
) AS $$
DECLARE
    v_promo promo_codes%ROWTYPE;
    v_user_uses INTEGER;
    v_discount DECIMAL;
BEGIN
    -- Récupérer le code promo
    SELECT * INTO v_promo
    FROM promo_codes
    WHERE code = UPPER(TRIM(p_code))
      AND is_active = TRUE
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_until IS NULL OR valid_until >= NOW());
    
    -- Vérifier si le code existe
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Code promo invalide ou expiré'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- Vérifier le montant minimum
    IF p_order_amount < v_promo.min_order_amount THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL, 
            format('Montant minimum de commande requis: %s€', v_promo.min_order_amount)::TEXT,
            NULL::UUID;
        RETURN;
    END IF;
    
    -- Vérifier le restaurant (si restriction)
    IF v_promo.restaurant_id IS NOT NULL AND v_promo.restaurant_id != p_restaurant_id THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Ce code promo n''est pas valable pour ce restaurant'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- Vérifier première commande uniquement
    IF v_promo.first_order_only AND NOT p_is_first_order THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Ce code promo est réservé à votre première commande'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- Vérifier les utilisations totales
    IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Ce code promo a atteint son nombre maximum d''utilisations'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- Vérifier les utilisations par utilisateur
    IF p_user_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_user_uses
        FROM promo_code_usage
        WHERE promo_code_id = v_promo.id
          AND user_id = p_user_id;
        
        IF v_user_uses >= v_promo.max_uses_per_user THEN
            RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Vous avez déjà utilisé ce code promo'::TEXT, NULL::UUID;
            RETURN;
        END IF;
    END IF;
    
    -- Calculer la réduction
    CASE v_promo.discount_type
        WHEN 'percentage' THEN
            v_discount := (p_order_amount * v_promo.discount_value / 100);
            IF v_promo.max_discount_amount IS NOT NULL THEN
                v_discount := LEAST(v_discount, v_promo.max_discount_amount);
            END IF;
        WHEN 'fixed' THEN
            v_discount := LEAST(v_promo.discount_value, p_order_amount);
        WHEN 'free_delivery' THEN
            v_discount := 0; -- Sera géré séparément
        ELSE
            v_discount := 0;
    END CASE;
    
    RETURN QUERY SELECT TRUE, v_discount, 'Code promo valide'::TEXT, v_promo.id;
END;
$$ LANGUAGE plpgsql;

-- 5. Codes promo par défaut pour booster les ventes
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, max_uses_per_user, first_order_only, is_active) VALUES
('BIENVENUE10', '10% de réduction sur votre première commande', 'percentage', 10, 15.00, 1, TRUE, TRUE),
('BIENVENUE5', '5€ de réduction sur votre première commande', 'fixed', 5.00, 20.00, 1, TRUE, TRUE),
('WEEKEND15', '15% de réduction le weekend', 'percentage', 15, 25.00, 1, FALSE, TRUE),
('FIDELITE20', '20% de réduction pour les clients fidèles', 'percentage', 20, 30.00, 1, FALSE, TRUE),
('LIVRAISON0', 'Livraison gratuite', 'free_delivery', 0, 20.00, 1, FALSE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 6. Commentaires
COMMENT ON TABLE promo_codes IS 'Codes promo pour booster les ventes';
COMMENT ON TABLE promo_code_usage IS 'Historique d''utilisation des codes promo';
COMMENT ON FUNCTION validate_promo_code IS 'Valide un code promo et calcule la réduction';


ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 20.00;

UPDATE restaurants 
SET commission_rate = 15.00
WHERE LOWER(nom) LIKE '%all%ovale%' OR LOWER(nom) LIKE '%allovale%';

ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS restaurant_payout DECIMAL(10,2);

DO $$
DECLARE
    v_restaurant_id UUID;
    v_old_rate DECIMAL(5,2) := 20.00;
    v_new_rate DECIMAL(5,2) := 15.00;
    v_order RECORD;
    v_total DECIMAL(10,2);
    v_commission DECIMAL(10,2);
    v_payout DECIMAL(10,2);
BEGIN
    SELECT id INTO v_restaurant_id
    FROM restaurants
    WHERE LOWER(nom) LIKE '%all%ovale%' OR LOWER(nom) LIKE '%allovale%'
    LIMIT 1;
    
    IF v_restaurant_id IS NULL THEN
        RAISE NOTICE 'Restaurant All''ovale non trouvé';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Restaurant trouvé: %', v_restaurant_id;
    
    FOR v_order IN 
        SELECT id, total, commission_rate, commission_amount, restaurant_payout, statut, payment_status
        FROM commandes
        WHERE restaurant_id = v_restaurant_id
          AND total > 0
          AND statut != 'annulee'
          AND (statut = 'livree' OR payment_status = 'paid')
    LOOP
        v_total := COALESCE(v_order.total, 0);
        v_commission := ROUND(v_total * v_new_rate / 100, 2);
        v_payout := ROUND(v_total - v_commission, 2);
        
        UPDATE commandes
        SET 
            commission_rate = v_new_rate,
            commission_amount = v_commission,
            restaurant_payout = v_payout,
            updated_at = NOW()
        WHERE id = v_order.id;
        
        RAISE NOTICE 'Commande % mise à jour: Total=%, Commission=%, Payout=%', 
            v_order.id, v_total, v_commission, v_payout;
    END LOOP;
    
    RAISE NOTICE 'Recalcul terminé pour All''ovale';
END $$;

SELECT 
    r.nom,
    r.commission_rate,
    COUNT(c.id) as total_commandes,
    SUM(c.total) as total_ca,
    SUM(c.commission_amount) as total_commission,
    SUM(c.restaurant_payout) as total_payout
FROM restaurants r
LEFT JOIN commandes c ON c.restaurant_id = r.id
    AND c.total > 0
    AND c.statut != 'annulee'
    AND (c.statut = 'livree' OR c.payment_status = 'paid')
WHERE LOWER(r.nom) LIKE '%all%ovale%' OR LOWER(r.nom) LIKE '%allovale%'
GROUP BY r.id, r.nom, r.commission_rate;

-- RESTAURATION: remettre en état les commandes qui ont été annulées par erreur
-- (seules les commandes du restaurant "99 Street Food" devaient être annulées)
--
-- Ce script remet en "en_attente" + "paid" toutes les commandes actuellement annulées
-- dont le restaurant N'EST PAS 99 Street Food.
--
-- À exécuter dans Supabase SQL Editor.
-- Si tu as un backup / point-in-time recovery Supabase, privilégie une restauration depuis le backup.

-- 1) Voir combien de commandes vont être restaurées (toutes sauf 99 Street Food)
SELECT 
    c.id,
    c.restaurant_id,
    r.nom as restaurant_nom,
    c.statut,
    c.payment_status,
    c.total,
    c.created_at
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE c.statut = 'annulee'
  AND r.id NOT IN (
    SELECT id FROM restaurants
    WHERE nom ILIKE '%99 street%'
       OR nom ILIKE '%99street%'
       OR nom ILIKE '%99 street food%'
  )
ORDER BY c.created_at DESC;

-- 2) RESTAURER : remettre en_attente et payment_status paid/pending
UPDATE commandes
SET 
    statut = 'en_attente',
    payment_status = CASE 
        WHEN payment_status = 'refunded' THEN 'paid'
        WHEN payment_status = 'cancelled' THEN 'pending'
        ELSE payment_status
    END,
    updated_at = NOW()
WHERE statut = 'annulee'
  AND restaurant_id NOT IN (
    SELECT id FROM restaurants
    WHERE nom ILIKE '%99 street%'
       OR nom ILIKE '%99street%'
       OR nom ILIKE '%99 street food%'
  );

-- 3) Vérification : plus aucune commande annulée sauf celles de 99 Street Food
SELECT 
    r.nom,
    c.statut,
    c.payment_status,
    COUNT(*) as nb
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE c.statut = 'annulee'
GROUP BY r.nom, c.statut, c.payment_status;

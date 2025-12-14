-- Script pour activer une publicité en statut "pending"
-- Remplace 'ID_DE_TA_PUB' par l'ID de ta publicité

-- Option 1 : Approuver directement la publicité
UPDATE advertisements
SET 
  status = 'approved',
  is_active = true,
  start_date = COALESCE(start_date, CURRENT_DATE),
  end_date = COALESCE(end_date, CURRENT_DATE + INTERVAL '30 days')
WHERE id = 'ID_DE_TA_PUB';

-- Option 2 : Si le paiement est validé, mettre payment_status = 'paid'
-- (La publicité s'affichera automatiquement si status = 'pending_approval' ET payment_status = 'paid')
UPDATE advertisements
SET 
  payment_status = 'paid',
  is_active = true
WHERE id = 'ID_DE_TA_PUB' AND status = 'pending_approval';

-- Pour voir toutes tes publicités et leurs statuts :
SELECT 
  id,
  title,
  position,
  is_active,
  status,
  payment_status,
  start_date,
  end_date,
  image_url,
  CASE 
    WHEN is_active = false THEN '❌ Inactif'
    WHEN status = 'approved' THEN '✅ Approuvé'
    WHEN status = 'active' THEN '✅ Actif'
    WHEN status = 'pending_approval' AND payment_status = 'paid' THEN '✅ En attente (paiement validé)'
    WHEN status = 'pending_approval' AND payment_status != 'paid' THEN '⏳ En attente (paiement non validé)'
    ELSE '❌ Statut invalide'
  END as etat
FROM advertisements
ORDER BY created_at DESC;


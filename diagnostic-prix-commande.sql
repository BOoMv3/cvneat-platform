-- Diagnostic des prix de la commande #52
-- À exécuter dans Supabase SQL Editor

-- 1. Voir la commande #52 avec tous ses détails
SELECT 
  id,
  customer_name,
  total_amount,
  delivery_fee,
  items,
  created_at
FROM orders 
WHERE id = 52;

-- 2. Calculer le sous-total à partir des articles
-- (Cette requête va extraire et calculer la somme des articles)
SELECT 
  id,
  total_amount,
  delivery_fee,
  total_amount - delivery_fee as sous_total_calcule,
  items
FROM orders 
WHERE id = 52;

-- 3. Vérifier s'il y a d'autres commandes avec le même problème
SELECT 
  id,
  customer_name,
  total_amount,
  delivery_fee,
  total_amount - delivery_fee as sous_total_calcule,
  CASE 
    WHEN total_amount - delivery_fee != total_amount THEN 'INCOHERENT'
    ELSE 'COHERENT'
  END as statut_calcul
FROM orders 
WHERE total_amount IS NOT NULL 
  AND delivery_fee IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10;

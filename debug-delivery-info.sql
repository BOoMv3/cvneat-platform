-- SCRIPT POUR DIAGNOSTIQUER LES INFORMATIONS DE LIVRAISON MANQUANTES
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER LES COMMANDES PRÊTES ET LEURS INFORMATIONS
SELECT 
  id,
  statut,
  restaurant_id,
  livreur_id,
  adresse_livraison,
  total,
  frais_livraison,
  created_at
FROM commandes 
WHERE statut IN ('pret_a_livrer', 'en_livraison')
ORDER BY created_at DESC;

-- 2. VÉRIFIER LES RESTAURANTS ASSOCIÉS
SELECT 
  r.id,
  r.nom,
  r.adresse,
  r.telephone,
  r.frais_livraison,
  COUNT(c.id) as commandes_actives
FROM restaurants r
LEFT JOIN commandes c ON c.restaurant_id = r.id 
  AND c.statut IN ('pret_a_livrer', 'en_livraison')
GROUP BY r.id, r.nom, r.adresse, r.telephone, r.frais_livraison;

-- 3. VÉRIFIER LES DÉTAILS DES COMMANDES
SELECT 
  c.id as commande_id,
  c.statut,
  c.adresse_livraison,
  c.total,
  c.frais_livraison,
  r.nom as restaurant_nom,
  r.adresse as restaurant_adresse,
  r.telephone as restaurant_telephone,
  r.frais_livraison as restaurant_frais_livraison
FROM commandes c
JOIN restaurants r ON c.restaurant_id = r.id
WHERE c.statut IN ('pret_a_livrer', 'en_livraison')
ORDER BY c.created_at DESC;

-- 4. VÉRIFIER LA STRUCTURE DE LA TABLE COMMANDES
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'commandes' 
  AND table_schema = 'public'
  AND column_name IN ('adresse_livraison', 'frais_livraison', 'total', 'restaurant_id')
ORDER BY column_name;

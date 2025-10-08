-- SCRIPT POUR CRÉER UNE POLITIQUE RLS POUR LES LIVREURS
-- À exécuter dans Supabase SQL Editor

-- 1. CRÉER UNE POLITIQUE POUR QUE LES LIVREURS PUISSENT VOIR LES COMMANDES PRÊTES
CREATE POLICY "Delivery drivers can view available orders"
ON public.commandes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'delivery'
  )
  AND (
    -- Les livreurs peuvent voir les commandes prêtes sans livreur assigné
    (statut = 'pret_a_livrer' AND livreur_id IS NULL)
    OR
    -- Les livreurs peuvent voir leurs propres commandes assignées
    (livreur_id = auth.uid())
    OR
    -- Les livreurs peuvent voir les commandes en préparation (pour info)
    (statut = 'en_preparation')
  )
);

-- 2. CRÉER UNE POLITIQUE POUR QUE LES LIVREURS PUISSENT ACCEPTER DES COMMANDES
CREATE POLICY "Delivery drivers can accept orders"
ON public.commandes FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'delivery'
  )
  AND (
    -- Les livreurs peuvent accepter des commandes prêtes sans livreur
    (statut = 'pret_a_livrer' AND livreur_id IS NULL)
    OR
    -- Les livreurs peuvent modifier leurs propres commandes
    (livreur_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'delivery'
  )
  AND (
    -- Les livreurs peuvent accepter des commandes prêtes sans livreur
    (statut = 'pret_a_livrer' AND livreur_id IS NULL)
    OR
    -- Les livreurs peuvent modifier leurs propres commandes
    (livreur_id = auth.uid())
  )
);

-- 3. VÉRIFIER QUE LES POLITIQUES ONT ÉTÉ CRÉÉES
SELECT 
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'commandes'
  AND policyname LIKE '%delivery%'
ORDER BY policyname;

-- 4. TESTER LA REQUÊTE LIVREUR
SELECT 
  id,
  statut,
  restaurant_id,
  total,
  livreur_id,
  created_at
FROM commandes 
WHERE statut = 'pret_a_livrer' 
  AND livreur_id IS NULL
ORDER BY created_at DESC 
LIMIT 5;

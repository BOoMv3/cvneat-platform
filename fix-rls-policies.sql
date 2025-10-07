-- SCRIPT POUR CORRIGER LES POLITIQUES RLS
-- À exécuter dans Supabase SQL Editor

-- 1. SUPPRIMER LES ANCIENNES POLITIQUES (si elles existent)
DROP POLICY IF EXISTS "Restaurants can view their own orders" ON commandes;
DROP POLICY IF EXISTS "Restaurants can update their own orders" ON commandes;
DROP POLICY IF EXISTS "Users can view their own orders" ON commandes;

-- 2. CRÉER LES NOUVELLES POLITIQUES RLS

-- Politique pour permettre aux restaurants de voir leurs commandes
CREATE POLICY "Restaurants can view their own orders" ON commandes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.id = commandes.restaurant_id 
    AND r.user_id = auth.uid()
  )
);

-- Politique pour permettre aux restaurants de mettre à jour leurs commandes
CREATE POLICY "Restaurants can update their own orders" ON commandes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.id = commandes.restaurant_id 
    AND r.user_id = auth.uid()
  )
);

-- Politique pour permettre aux utilisateurs de voir leurs propres commandes
CREATE POLICY "Users can view their own orders" ON commandes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. VÉRIFIER QUE RLS EST BIEN ACTIVÉ
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'commandes';

-- 4. VÉRIFIER LES POLITIQUES CRÉÉES
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'commandes';

-- 5. TESTER LA REQUÊTE AVEC LE CONTEXTE AUTHENTIFIÉ
-- Cette requête devrait maintenant fonctionner
SELECT COUNT(*) as commandes_visibles
FROM commandes
WHERE restaurant_id = '4572cee6-1fc6-4f32-b007-57c46871ec70';

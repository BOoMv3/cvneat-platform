-- ============================================
-- POLITIQUES SUPABASE STORAGE POUR LES BUCKETS
-- ============================================
-- Ce fichier contient les politiques SQL à exécuter dans Supabase SQL Editor
-- pour permettre l'upload et la lecture publique des images

-- ============================================
-- ÉTAPE 1: SUPPRIMER LES ANCIENNES POLITIQUES (si elles existent)
-- ============================================
-- Décommentez et exécutez ces lignes si vous avez déjà des politiques
-- et que vous voulez les remplacer

/*
DROP POLICY IF EXISTS "Permettre upload menu-images authentifié" ON storage.objects;
DROP POLICY IF EXISTS "Permettre upload menu-images anonyme" ON storage.objects;
DROP POLICY IF EXISTS "Permettre lecture publique menu-images" ON storage.objects;

DROP POLICY IF EXISTS "Permettre upload restaurants-images authentifié" ON storage.objects;
DROP POLICY IF EXISTS "Permettre upload restaurants-images anonyme" ON storage.objects;
DROP POLICY IF EXISTS "Permettre lecture publique restaurants-images" ON storage.objects;

DROP POLICY IF EXISTS "Permettre upload publicité-images authentifié" ON storage.objects;
DROP POLICY IF EXISTS "Permettre upload publicité-images anonyme" ON storage.objects;
DROP POLICY IF EXISTS "Permettre lecture publique publicité-images" ON storage.objects;

DROP POLICY IF EXISTS "Permettre upload images authentifié" ON storage.objects;
DROP POLICY IF EXISTS "Permettre upload images anonyme" ON storage.objects;
DROP POLICY IF EXISTS "Permettre lecture publique images" ON storage.objects;
*/

-- ============================================
-- BUCKET: MENU-IMAGES
-- ============================================

-- Politique 1: Permettre l'upload (INSERT) pour les utilisateurs authentifiés
CREATE POLICY "Permettre upload menu-images authentifié"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'MENU-IMAGES'::text
);

-- Politique 2: Permettre l'upload (INSERT) pour les utilisateurs anonymes (si nécessaire)
CREATE POLICY "Permettre upload menu-images anonyme"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'MENU-IMAGES'::text
);

-- Politique 3: Permettre la lecture publique (SELECT)
CREATE POLICY "Permettre lecture publique menu-images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'MENU-IMAGES'::text
);

-- ============================================
-- BUCKET: RESTAURANTS-IMAGES
-- ============================================

-- Politique 1: Permettre l'upload (INSERT) pour les utilisateurs authentifiés
CREATE POLICY "Permettre upload restaurants-images authentifié"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'RESTAURANTS-IMAGES'::text
);

-- Politique 2: Permettre l'upload (INSERT) pour les utilisateurs anonymes (si nécessaire)
CREATE POLICY "Permettre upload restaurants-images anonyme"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'RESTAURANTS-IMAGES'::text
);

-- Politique 3: Permettre la lecture publique (SELECT)
CREATE POLICY "Permettre lecture publique restaurants-images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'RESTAURANTS-IMAGES'::text
);

-- ============================================
-- BUCKET: PUBLICITÉ-IMAGES
-- ============================================

-- Politique 1: Permettre l'upload (INSERT) pour les utilisateurs authentifiés
CREATE POLICY "Permettre upload publicité-images authentifié"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'PUBLICITÉ-IMAGES'::text
);

-- Politique 2: Permettre l'upload (INSERT) pour les utilisateurs anonymes (si nécessaire)
CREATE POLICY "Permettre upload publicité-images anonyme"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'PUBLICITÉ-IMAGES'::text
);

-- Politique 3: Permettre la lecture publique (SELECT)
CREATE POLICY "Permettre lecture publique publicité-images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'PUBLICITÉ-IMAGES'::text
);

-- ============================================
-- BUCKET: IMAGES (si utilisé)
-- ============================================

-- Politique 1: Permettre l'upload (INSERT) pour les utilisateurs authentifiés
CREATE POLICY "Permettre upload images authentifié"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'IMAGES'::text
);

-- Politique 2: Permettre l'upload (INSERT) pour les utilisateurs anonymes (si nécessaire)
CREATE POLICY "Permettre upload images anonyme"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'IMAGES'::text
);

-- Politique 3: Permettre la lecture publique (SELECT)
CREATE POLICY "Permettre lecture publique images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'IMAGES'::text
);

-- ============================================
-- NOTES IMPORTANTES:
-- ============================================
-- 1. Ces politiques doivent être exécutées dans Supabase SQL Editor
-- 2. Assurez-vous que les buckets existent et sont marqués comme "Public"
-- 3. Si vous obtenez une erreur "policy already exists", supprimez d'abord les anciennes politiques
-- 4. Pour supprimer une politique existante, utilisez:
--    DROP POLICY "nom_de_la_politique" ON storage.objects;
-- ============================================


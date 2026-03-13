-- Accepter la candidature livreur de Dorrian Bié et passer son compte en rôle livreur
-- Exécuter dans Supabase → SQL Editor

-- 1. Mettre à jour le rôle en 'delivery' pour l'utilisateur lié à la candidature "Dorrian Bié"
UPDATE users
SET role = 'delivery', updated_at = NOW()
WHERE id = (
  SELECT user_id FROM delivery_applications
  WHERE (prenom ILIKE '%dorrian%' OR prenom ILIKE '%doriian%')
    AND (nom ILIKE '%bié%' OR nom ILIKE '%bie%')
  ORDER BY created_at DESC
  LIMIT 1
);

-- 2. Marquer la candidature comme approuvée
UPDATE delivery_applications
SET status = 'approved', updated_at = NOW()
WHERE (prenom ILIKE '%dorrian%' OR prenom ILIKE '%doriian%')
  AND (nom ILIKE '%bié%' OR nom ILIKE '%bie%')
  AND status = 'pending';

-- Vérification
SELECT u.id, u.prenom, u.nom, u.email, u.role, u.updated_at
FROM users u
WHERE (u.prenom ILIKE '%dorrian%' OR u.prenom ILIKE '%doriian%')
  AND (u.nom ILIKE '%bié%' OR u.nom ILIKE '%bie%');

SELECT da.id, da.prenom, da.nom, da.email, da.status, da.updated_at
FROM delivery_applications da
WHERE (da.prenom ILIKE '%dorrian%' OR da.prenom ILIKE '%doriian%')
  AND (da.nom ILIKE '%bié%' OR da.nom ILIKE '%bie%');

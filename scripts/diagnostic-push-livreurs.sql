-- Diagnostic: vérifier pourquoi les livreurs ne reçoivent pas les push
-- Exécuter dans Supabase → SQL Editor

-- 1. Livreurs (users = vue auth.users + user_details)
SELECT u.id, u.email, u.prenom, u.nom, u.role
FROM users u
WHERE u.role IN ('delivery', 'livreur')
   OR u.role ILIKE '%delivery%'
   OR u.role ILIKE '%livreur%';

-- 2. Tokens device (app mobile) pour ces livreurs
SELECT dt.id, dt.user_id, dt.platform, LEFT(dt.token, 20) || '...' as token_preview, dt.updated_at
FROM device_tokens dt
WHERE dt.user_id IN (
  SELECT u.id FROM users u
  WHERE u.role IN ('delivery', 'livreur')
     OR u.role ILIKE '%delivery%'
     OR u.role ILIKE '%livreur%'
)
ORDER BY dt.platform, dt.updated_at DESC;

-- 3. Si aucun token : les livreurs doivent ouvrir l'app mobile et se connecter
--    pour que leur device_token soit enregistré via /api/notifications/register-device

-- Créer l'utilisateur admin pour le chat
INSERT INTO users (id, nom, prenom, role, email, created_at, updated_at)
VALUES (
  'admin-user',
  'Admin',
  'Test',
  'admin',
  'admin@test.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  prenom = EXCLUDED.prenom,
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  updated_at = NOW();

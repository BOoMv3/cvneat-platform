-- Rôle associé (semi-admin lecture seule)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'admin', 'restaurant', 'delivery', 'livreur', 'comptable', 'associe'));

COMMENT ON COLUMN public.users.role IS 'Roles: user, admin, restaurant, delivery/livreur, comptable, associe (lecture seule)';

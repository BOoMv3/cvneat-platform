-- Fix: permettre l'INSERT dans restaurants_status_audit depuis les triggers
-- (sinon les updates sur public.restaurants cassent avec "violates row-level security").

BEGIN;

-- Ajoute une politique d'INSERT permissive (audit = technique/debug).
-- La lecture reste réservée à admin via audit_admin_read.
DROP POLICY IF EXISTS restaurants_status_audit_insert_all ON public.restaurants_status_audit;
CREATE POLICY restaurants_status_audit_insert_all
ON public.restaurants_status_audit
FOR INSERT
WITH CHECK (true);

COMMIT;


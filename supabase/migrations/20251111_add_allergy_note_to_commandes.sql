-- Ajoute une colonne pour les notes d'allergies laissées par les clients
alter table if exists public.commandes
  add column if not exists allergy_note text;


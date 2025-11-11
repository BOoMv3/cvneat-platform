alter table commandes
  add column if not exists customer_first_name text,
  add column if not exists customer_last_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists preparation_started_at timestamp with time zone;

update commandes
set preparation_started_at = coalesce(preparation_started_at, accepted_at, updated_at)
where preparation_started_at is null;


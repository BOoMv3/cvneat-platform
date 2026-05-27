-- Mode de retrait/livraison sur les commandes
alter table if exists public.commandes
  add column if not exists order_fulfillment text not null default 'delivery';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'commandes_order_fulfillment_check'
  ) then
    alter table public.commandes
      add constraint commandes_order_fulfillment_check
      check (order_fulfillment in ('delivery', 'pickup'));
  end if;
end $$;

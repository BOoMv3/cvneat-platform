-- Migration : création des tables pour les menus composés

create table if not exists public.menu_combos (
    id uuid primary key default gen_random_uuid(),
    restaurant_id uuid not null references public.restaurants (id) on delete cascade,
    nom text not null,
    description text,
    prix_base numeric(10, 2) default 0 not null,
    actif boolean default true not null,
    ordre_affichage integer default 0 not null,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists menu_combos_restaurant_id_idx
    on public.menu_combos (restaurant_id);

create table if not exists public.menu_combo_steps (
    id uuid primary key default gen_random_uuid(),
    combo_id uuid not null references public.menu_combos (id) on delete cascade,
    title text not null,
    description text,
    min_selections integer default 1 not null,
    max_selections integer default 1 not null,
    ordre integer default 0 not null,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null,
    check (min_selections >= 0),
    check (max_selections >= min_selections),
    check (max_selections >= 1)
);

create index if not exists menu_combo_steps_combo_id_idx
    on public.menu_combo_steps (combo_id);

create table if not exists public.menu_combo_options (
    id uuid primary key default gen_random_uuid(),
    step_id uuid not null references public.menu_combo_steps (id) on delete cascade,
    type text not null check (type in ('link_to_item', 'custom')),
    linked_menu_id uuid references public.menus (id) on delete set null,
    nom text not null,
    description text,
    prix_supplementaire numeric(10, 2) default 0 not null,
    image_url text,
    disponible boolean default true not null,
    ordre integer default 0 not null,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists menu_combo_options_step_id_idx
    on public.menu_combo_options (step_id);

create table if not exists public.menu_combo_option_variants (
    id uuid primary key default gen_random_uuid(),
    option_id uuid not null references public.menu_combo_options (id) on delete cascade,
    nom text not null,
    description text,
    prix_supplementaire numeric(10, 2) default 0 not null,
    is_default boolean default false not null,
    disponible boolean default true not null,
    ordre integer default 0 not null,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists menu_combo_option_variants_option_id_idx
    on public.menu_combo_option_variants (option_id);

-- Triggers pour updated_at

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_menu_combos_updated_at on public.menu_combos;
create trigger set_menu_combos_updated_at
before update on public.menu_combos
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists set_menu_combo_steps_updated_at on public.menu_combo_steps;
create trigger set_menu_combo_steps_updated_at
before update on public.menu_combo_steps
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists set_menu_combo_options_updated_at on public.menu_combo_options;
create trigger set_menu_combo_options_updated_at
before update on public.menu_combo_options
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists set_menu_combo_option_variants_updated_at on public.menu_combo_option_variants;
create trigger set_menu_combo_option_variants_updated_at
before update on public.menu_combo_option_variants
for each row
execute function public.set_updated_at_timestamp();


-- Ajoute la table des ingrédients de base pour les options de menus composés

create table if not exists public.menu_combo_option_base_ingredients (
    id uuid primary key default gen_random_uuid(),
    option_id uuid not null references public.menu_combo_options (id) on delete cascade,
    nom text not null,
    prix_supplementaire numeric(10, 2) default 0 not null,
    removable boolean default true not null,
    ordre integer default 0 not null,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists menu_combo_option_base_ing_option_id_idx
    on public.menu_combo_option_base_ingredients (option_id);

drop trigger if exists set_menu_combo_option_base_ing_updated_at on public.menu_combo_option_base_ingredients;
create trigger set_menu_combo_option_base_ing_updated_at
before update on public.menu_combo_option_base_ingredients
for each row
execute function public.set_updated_at_timestamp();



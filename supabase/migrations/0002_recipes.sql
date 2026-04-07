-- Recipes
create table recipes (
  id                 uuid primary key default uuid_generate_v4(),
  restaurant_id      uuid not null references restaurants(id) on delete cascade,
  name_he            text not null,
  category           text,
  selling_price      numeric(12, 4),
  portions           integer not null default 1,
  target_margin_pct  numeric(5, 2) not null default 65,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);

-- Recipe ingredients (lines)
create table recipe_ingredients (
  id             uuid primary key default uuid_generate_v4(),
  recipe_id      uuid not null references recipes(id) on delete cascade,
  ingredient_id  uuid not null references ingredients(id) on delete cascade,
  quantity       numeric(12, 4) not null,
  yield_pct      numeric(5, 2) not null default 100
);

-- Indexes
create index recipes_restaurant_id_idx on recipes(restaurant_id);
create index recipe_ingredients_recipe_id_idx on recipe_ingredients(recipe_id);

-- RLS
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;

create policy "recipe_access" on recipes for all
  using (
    restaurant_id in (
      select id from restaurants where owner_id = auth.uid()
    )
  );

create policy "recipe_ingredient_access" on recipe_ingredients for all
  using (
    recipe_id in (
      select id from recipes where restaurant_id in (
        select id from restaurants where owner_id = auth.uid()
      )
    )
  );

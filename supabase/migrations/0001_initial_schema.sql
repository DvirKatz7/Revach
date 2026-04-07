-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enums
create type unit_type as enum ('kg', 'g', 'l', 'ml', 'unit');
create type kosher_type as enum ('meat', 'dairy', 'pareve');

-- Restaurants
create table restaurants (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  kosher_enabled        boolean not null default false,
  vat_rate              numeric(5, 4) not null default 0.17,
  default_margin_target numeric(5, 4) not null default 0.65,
  currency    text not null default 'ILS',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Ingredients
create table ingredients (
  id             uuid primary key default uuid_generate_v4(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  name_he        text not null,
  unit           unit_type not null,
  cost_per_unit  numeric(12, 4) not null,
  kosher_type    kosher_type not null default 'pareve',
  supplier       text,
  updated_at     timestamptz not null default now()
);

-- Indexes
create index ingredients_restaurant_id_idx on ingredients(restaurant_id);
create index restaurants_owner_id_idx on restaurants(owner_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger restaurants_updated_at
  before update on restaurants
  for each row execute function update_updated_at();

create trigger ingredients_updated_at
  before update on ingredients
  for each row execute function update_updated_at();

-- Row Level Security
alter table restaurants enable row level security;
alter table ingredients enable row level security;

create policy "owners can manage their restaurant"
  on restaurants for all
  using (owner_id = auth.uid());

create policy "owners can manage their ingredients"
  on ingredients for all
  using (
    restaurant_id in (
      select id from restaurants where owner_id = auth.uid()
    )
  );

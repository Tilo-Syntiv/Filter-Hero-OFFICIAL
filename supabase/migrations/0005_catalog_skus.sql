-- Catalog identity for Stripe / Klaviyo / accounts.
-- Wholesale cost and Filter King unit_price must never land here.

create table if not exists catalog_skus (
  id integer primary key,
  size text not null,
  merv integer not null,
  is_carbon boolean not null default false,
  image_url text,
  filter_hero_url text not null,
  filter_king_url text,
  parent_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_skus_size_idx on catalog_skus (size, merv, is_carbon);

alter table catalog_skus enable row level security;
alter table catalog_skus force row level security;

revoke all on table catalog_skus from anon, authenticated, public;

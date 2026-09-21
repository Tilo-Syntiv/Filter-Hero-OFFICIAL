-- FH-343: hosted catalog_skus still had the first-cut commerce columns
-- (product_id, name, wholesale_sku, list_price, stripe/klaviyo ids).
-- The repo sync writes identity only. Recreate if the old PK is present.
-- Also finish FH-205: revoke leftover sequence + function EXECUTE from
-- anon / authenticated / public.

revoke all on sequence crm_audit_log_id_seq from anon, authenticated, public;
revoke all on function public.crm_touch_updated_at() from anon, authenticated, public;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'catalog_skus'
      and column_name = 'product_id'
  ) then
    drop table catalog_skus;
  end if;
end $$;

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

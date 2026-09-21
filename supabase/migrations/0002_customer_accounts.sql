-- Filter Hero customer accounts.
--
-- Shoppers sign in with the same Supabase Auth magic link as staff. A valid
-- session proves they control an inbox. Staff still need STAFF_EMAILS for
-- /admin; everyone else is a customer and can only read their own rows
-- through the Express /api/account routes.
--
-- RLS is deny-by-default: every table has RLS enabled and zero policies, so
-- anon and authenticated roles can read nothing. The Express server is the
-- only caller and it uses the service role, which bypasses RLS. The real
-- isolation is requireCustomer + "where auth_user_id = session.id".
--
-- orders.json stays the append-only purchase record. These tables store the
-- profile and the household filter list. Purchase history is joined by email
-- at read time, not copied here.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table if not exists customer_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  email text not null unique,
  first_name text,
  last_name text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_profiles_email_lowercase check (email = lower(email))
);

create index if not exists customer_profiles_email_idx on customer_profiles (email);

-- ---------------------------------------------------------------------------
-- Saved household filters
-- ---------------------------------------------------------------------------

create table if not exists customer_saved_filters (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references customer_profiles (id) on delete cascade,
  product_id integer not null,
  size text not null,
  merv integer not null,
  name text,
  notes text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  constraint customer_saved_filters_source_check check (source in ('manual', 'purchase')),
  constraint customer_saved_filters_unique unique (profile_id, product_id)
);

create index if not exists customer_saved_filters_profile_idx
  on customer_saved_filters (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS deny-by-default
-- ---------------------------------------------------------------------------

alter table customer_profiles enable row level security;
alter table customer_saved_filters enable row level security;

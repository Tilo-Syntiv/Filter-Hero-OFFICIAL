-- Guests and Filter Clock saves who are not account holders.
-- status is always not_an_actual_customer. Do not put these in crm_contacts
-- (FH-131 / FH-387: clock is not a sales opportunity).

create table if not exists non_customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country text,
  status text not null default 'not_an_actual_customer',
  source text not null,
  lead_id text,
  cadence jsonb not null default '{}'::jsonb,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint non_customers_email_lowercase check (email = lower(email)),
  constraint non_customers_status_check check (status = 'not_an_actual_customer'),
  constraint non_customers_source_check check (
    source in ('filter_clock', 'checkout', 'contact', 'stock_alert', 'other')
  )
);

create index if not exists non_customers_updated_idx
  on non_customers (updated_at desc);

alter table non_customers enable row level security;
alter table non_customers force row level security;

revoke all on table non_customers from anon, authenticated, public;

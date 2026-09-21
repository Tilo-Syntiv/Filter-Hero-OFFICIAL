-- Filter Hero CRM — staff-only quote pipeline.
--
-- Scope note: this is the HubSpot subset the shop needs (contacts, companies,
-- deals, one pipeline, notes/tasks). No dynamic property definitions, no
-- generic association graph, no marketing objects. Klaviyo owns marketing,
-- Stripe owns money, Resend owns transactional mail. See docs/CRM.md.
--
-- RLS is deny-by-default: every table has RLS enabled and zero policies, so
-- anon and authenticated roles can read nothing. The Express server is the only
-- caller and it uses the service role, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- Pipelines and stages
-- ---------------------------------------------------------------------------

create table if not exists crm_pipelines (
  id text primary key,
  label text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists crm_stages (
  id text primary key,
  pipeline_id text not null references crm_pipelines (id) on delete cascade,
  label text not null,
  display_order integer not null,
  closed_won boolean not null default false,
  closed_lost boolean not null default false,
  created_at timestamptz not null default now(),
  constraint crm_stages_not_both_closed check (not (closed_won and closed_lost))
);

create index if not exists crm_stages_pipeline_idx
  on crm_stages (pipeline_id, display_order);

-- ---------------------------------------------------------------------------
-- Companies and contacts
-- ---------------------------------------------------------------------------

create table if not exists crm_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text unique,
  phone text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text,
  last_name text,
  phone text,
  company_id uuid references crm_companies (id) on delete set null,
  klaviyo_profile_id text,
  stripe_customer_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The app lowercases before writing. Enforce it so upserts cannot split a
  -- person into two records on casing alone.
  constraint crm_contacts_email_lowercase check (email = lower(email))
);

create index if not exists crm_contacts_company_idx on crm_contacts (company_id);

-- ---------------------------------------------------------------------------
-- Deals
-- ---------------------------------------------------------------------------

create table if not exists crm_deals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pipeline_id text not null references crm_pipelines (id),
  stage_id text not null references crm_stages (id),
  contact_id uuid references crm_contacts (id) on delete set null,
  company_id uuid references crm_companies (id) on delete set null,
  owner_id uuid,
  amount numeric(12, 2),
  -- The anti-ghosting field. A deal with no next action is how the inbox died.
  next_action_at timestamptz,
  closed_at timestamptz,
  lost_reason text,
  source text not null,
  -- nanoid from server/data/leads.json. Makes intake idempotent when Stripe or
  -- the client retries a submit.
  lead_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_deals_source_check check (
    source in ('quote_form', 'custom_quote', 'cart_quote', 'manual')
  )
);

create unique index if not exists crm_deals_lead_id_key
  on crm_deals (lead_id)
  where lead_id is not null;

create index if not exists crm_deals_stage_idx on crm_deals (stage_id);
create index if not exists crm_deals_contact_idx on crm_deals (contact_id);
create index if not exists crm_deals_next_action_idx
  on crm_deals (next_action_at)
  where closed_at is null;

-- ---------------------------------------------------------------------------
-- Activities (HubSpot engagements, trimmed to notes / tasks / system events)
-- ---------------------------------------------------------------------------

create table if not exists crm_activities (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  deal_id uuid references crm_deals (id) on delete cascade,
  contact_id uuid references crm_contacts (id) on delete cascade,
  owner_id uuid,
  subject text,
  body text,
  -- Tasks only. Mirrors HubSpot hs_task_status.
  status text,
  due_at timestamptz,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint crm_activities_type_check check (
    type in ('note', 'task', 'stage_change', 'system')
  ),
  constraint crm_activities_status_check check (
    status is null or status in ('NOT_STARTED', 'COMPLETED')
  )
);

create index if not exists crm_activities_deal_idx
  on crm_activities (deal_id, occurred_at desc);
create index if not exists crm_activities_contact_idx
  on crm_activities (contact_id, occurred_at desc);
create index if not exists crm_activities_open_task_idx
  on crm_activities (due_at)
  where type = 'task' and status = 'NOT_STARTED';

-- ---------------------------------------------------------------------------
-- Audit log — every staff mutation, with the actor
-- ---------------------------------------------------------------------------

create table if not exists crm_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);

create index if not exists crm_audit_log_entity_idx
  on crm_audit_log (entity, entity_id, at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function crm_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists crm_companies_touch on crm_companies;
create trigger crm_companies_touch
  before update on crm_companies
  for each row execute function crm_touch_updated_at();

drop trigger if exists crm_contacts_touch on crm_contacts;
create trigger crm_contacts_touch
  before update on crm_contacts
  for each row execute function crm_touch_updated_at();

drop trigger if exists crm_deals_touch on crm_deals;
create trigger crm_deals_touch
  before update on crm_deals
  for each row execute function crm_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: enabled everywhere, no policies. Service role only.
-- ---------------------------------------------------------------------------

alter table crm_pipelines enable row level security;
alter table crm_stages enable row level security;
alter table crm_companies enable row level security;
alter table crm_contacts enable row level security;
alter table crm_deals enable row level security;
alter table crm_activities enable row level security;
alter table crm_audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- Seed: the Quotes pipeline
-- ---------------------------------------------------------------------------

insert into crm_pipelines (id, label, display_order)
values ('quotes', 'Quotes', 0)
on conflict (id) do nothing;

insert into crm_stages (id, pipeline_id, label, display_order, closed_won, closed_lost)
values
  ('new',        'quotes', 'New',        0, false, false),
  ('needs_info', 'quotes', 'Needs info', 1, false, false),
  ('priced',     'quotes', 'Priced',     2, false, false),
  ('waiting',    'quotes', 'Waiting',    3, false, false),
  ('won',        'quotes', 'Won',        4, true,  false),
  ('lost',       'quotes', 'Lost',       5, false, true)
on conflict (id) do nothing;

-- FH-381. Put the Klaviyo profile id back on CRM contacts.
alter table public.crm_contacts
  add column if not exists klaviyo_profile_id text;

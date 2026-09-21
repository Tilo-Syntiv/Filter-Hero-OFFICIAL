-- FH-201: defense in depth on top of deny-by-default RLS.
-- The browser never queries these tables. Auth stays on the auth schema.
-- FORCE RLS so a table owner without BYPASSRLS cannot skip policies.
-- Revoke anon/authenticated/public grants so a later CREATE POLICY is not enough
-- to open the customer list.

alter table crm_pipelines force row level security;
alter table crm_stages force row level security;
alter table crm_companies force row level security;
alter table crm_contacts force row level security;
alter table crm_deals force row level security;
alter table crm_activities force row level security;
alter table crm_audit_log force row level security;
alter table customer_profiles force row level security;
alter table customer_saved_filters force row level security;

revoke all on table crm_pipelines from anon, authenticated, public;
revoke all on table crm_stages from anon, authenticated, public;
revoke all on table crm_companies from anon, authenticated, public;
revoke all on table crm_contacts from anon, authenticated, public;
revoke all on table crm_deals from anon, authenticated, public;
revoke all on table crm_activities from anon, authenticated, public;
revoke all on table crm_audit_log from anon, authenticated, public;
revoke all on table customer_profiles from anon, authenticated, public;
revoke all on table customer_saved_filters from anon, authenticated, public;

alter default privileges in schema public revoke all on tables from anon, authenticated, public;
alter default privileges in schema public revoke all on sequences from anon, authenticated, public;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;

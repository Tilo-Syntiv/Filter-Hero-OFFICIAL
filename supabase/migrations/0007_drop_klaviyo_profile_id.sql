-- FH-370. Klaviyo is uninstalled. The column is unused.
alter table public.crm_contacts drop column if exists klaviyo_profile_id;

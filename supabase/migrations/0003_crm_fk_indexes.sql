-- Cover the two deal foreign keys the advisor flagged as unindexed.
-- pipeline_id is always "quotes" today; company_id is used when a quote
-- is attached to a business. Both are cheap to keep.

create index if not exists crm_deals_pipeline_idx on crm_deals (pipeline_id);
create index if not exists crm_deals_company_idx on crm_deals (company_id);

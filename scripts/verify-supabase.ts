import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { recordLeadInCrm, closeDealsOnPurchase } from "../server/crm/intake.ts";
import {
  accountDisabledReason,
  accountHealth,
  crmDisabledReason,
  crmHealth,
  resetDbClient,
} from "../server/db.ts";

const PROJECT_REF = "mayxuwlygchatgeqyhyt";
const EXPECTED_URL = `https://${PROJECT_REF}.supabase.co`;
const EXPECTED_STAGES = ["new", "needs_info", "priced", "waiting", "won", "lost"];
const TABLES = [
  "crm_pipelines",
  "crm_stages",
  "crm_companies",
  "crm_contacts",
  "crm_deals",
  "crm_activities",
  "crm_audit_log",
  "customer_profiles",
  "customer_saved_filters",
];

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const url = (process.env.SUPABASE_URL || "").trim();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const anon = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  const viteUrl = (process.env.VITE_SUPABASE_URL || "").trim();
  const viteAnon = (process.env.VITE_SUPABASE_ANON_KEY || "").trim();

  assert(url === EXPECTED_URL, `SUPABASE_URL must be ${EXPECTED_URL}`);
  assert(viteUrl === EXPECTED_URL, `VITE_SUPABASE_URL must be ${EXPECTED_URL}`);
  assert(service && !service.includes("..."), "SUPABASE_SERVICE_ROLE_KEY is missing");
  assert(anon && !anon.includes("..."), "SUPABASE_ANON_KEY is missing");
  assert(viteAnon && !viteAnon.includes("..."), "VITE_SUPABASE_ANON_KEY is missing");
  assert(
    (process.env.STAFF_EMAILS || "").includes("info@filterhero.net"),
    "STAFF_EMAILS must include info@filterhero.net",
  );

  resetDbClient();
  assert(!crmDisabledReason(), `CRM is off: ${crmDisabledReason()}`);
  assert(!accountDisabledReason(), `Accounts are off: ${accountDisabledReason()}`);

  const crm = await crmHealth();
  assert(crm.enabled && crm.reachable, `CRM health failed: ${crm.error || "unreachable"}`);
  assert(crm.stages === 6, `expected 6 CRM stages, got ${crm.stages}`);

  const account = await accountHealth();
  assert(
    account.enabled && account.reachable,
    `Account health failed: ${account.error || "unreachable"}`,
  );

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const browser = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: stages, error: stageError } = await admin
    .from("crm_stages")
    .select("id, label, display_order")
    .order("display_order");
  assert(!stageError, `crm_stages query failed: ${stageError?.message}`);
  const ids = (stages || []).map((row) => row.id);
  assert(
    EXPECTED_STAGES.every((id) => ids.includes(id)),
    `CRM stages missing: ${EXPECTED_STAGES.filter((id) => !ids.includes(id)).join(", ")}`,
  );

  for (const table of TABLES) {
    const { error } = await admin.from(table).select("id", { count: "exact", head: true });
    assert(!error, `${table} is not readable with the service role: ${error?.message}`);
  }

  for (const table of ["crm_pipelines", "crm_stages"] as const) {
    const { data, error } = await browser.from(table).select("*");
    assert(
      (data?.length ?? 0) === 0,
      `${table} must hide every row from the anon key (got ${data?.length ?? 0}${error ? `, ${error.message}` : ""})`,
    );
  }

  const { error: anonWrite } = await browser.from("customer_profiles").insert({
    auth_user_id: "00000000-0000-4000-8000-000000000099",
    email: "anon-must-fail@filterhero.net",
  });
  assert(anonWrite, "anon insert into customer_profiles must fail under RLS");

  const probeEmail = `supabase-verify-${Date.now()}@filterhero.net`;
  const { data: profile, error: insertError } = await admin
    .from("customer_profiles")
    .insert({
      auth_user_id: "00000000-0000-4000-8000-000000000001",
      email: probeEmail,
    })
    .select("id")
    .single();
  assert(!insertError && profile?.id, `profile insert failed: ${insertError?.message}`);

  const { error: deleteError } = await admin
    .from("customer_profiles")
    .delete()
    .eq("id", profile.id);
  assert(!deleteError, `profile cleanup failed: ${deleteError?.message}`);

  const { error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  assert(!authError, `Auth admin API failed: ${authError?.message}`);

  const leadId = `verify-${Date.now()}`;
  const leadEmail = `crm-verify-${Date.now()}@filterhero.net`;
  const intake = await recordLeadInCrm({
    id: leadId,
    name: "Verify Person",
    email: leadEmail,
    filterSize: "20x25x1",
    message: "Automated CRM intake check. Delete me.",
    intent: "quote",
  });
  assert(intake.ok && intake.dealId, `CRM intake failed: ${intake.error || "no deal"}`);
  const { data: deal, error: dealError } = await admin
    .from("crm_deals")
    .select("id, stage_id, contact_id")
    .eq("id", intake.dealId)
    .single();
  assert(!dealError && deal?.stage_id === "new", `intake deal is not in New: ${dealError?.message}`);
  const closed = await closeDealsOnPurchase({ email: leadEmail, amount: 19.99 });
  assert(closed.ok && (closed.closed ?? 0) >= 1, `purchase close failed: ${closed.error}`);
  const { data: won, error: wonError } = await admin
    .from("crm_deals")
    .select("stage_id, closed_at")
    .eq("id", intake.dealId)
    .single();
  assert(!wonError && won?.stage_id === "won", `deal should be won, got ${won?.stage_id}`);
  if (deal?.contact_id) {
    await admin.from("crm_activities").delete().eq("contact_id", deal.contact_id);
    await admin.from("crm_deals").delete().eq("contact_id", deal.contact_id);
    await admin.from("crm_contacts").delete().eq("id", deal.contact_id);
  } else {
    await admin.from("crm_deals").delete().eq("id", intake.dealId);
    await admin.from("crm_contacts").delete().eq("email", leadEmail);
  }

  console.log("verify:supabase ok");
  console.log(`  project  ${PROJECT_REF}`);
  console.log(`  crm      ${crm.stages} stages reachable`);
  console.log("  account  customer_profiles reachable");
  console.log("  rls      seeded tables hidden from anon; anon writes denied");
  console.log("  write    service-role insert/delete ok");
  console.log("  intake   quote → New → Won on pay, then cleaned up");
  console.log("  auth     admin API ok");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

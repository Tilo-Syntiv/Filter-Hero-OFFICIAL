import "dotenv/config";
import {
  syncKlaviyoCatalog,
  syncStripeCatalog,
  syncSupabaseCatalog,
} from "./lib/catalog-sync.ts";

const stripe = await syncStripeCatalog();
const klaviyo = await syncKlaviyoCatalog();
const supabase = await syncSupabaseCatalog();
console.log(
  JSON.stringify(
    {
      stripe,
      klaviyo,
      supabase,
      note: "identity only — no wholesale cost, no API unit_price",
    },
    null,
    2,
  ),
);

import "dotenv/config";
import {
  syncStripeCatalog,
  syncSupabaseCatalog,
} from "./lib/catalog-sync.ts";

const stripe = await syncStripeCatalog();
const supabase = await syncSupabaseCatalog();
console.log(
  JSON.stringify(
    {
      stripe,
      supabase,
      note: "identity only — no wholesale cost, no API unit_price",
    },
    null,
    2,
  ),
);

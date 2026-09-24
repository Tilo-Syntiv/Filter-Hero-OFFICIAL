import "dotenv/config";
import { ensureKlaviyoStripeWebhook, klaviyoStripeStatus } from "../server/klaviyo-stripe.ts";

async function main() {
  const rotate = process.argv.includes("--rotate");
  const before = await klaviyoStripeStatus();
  const result = await ensureKlaviyoStripeWebhook({ rotate });
  const after = await klaviyoStripeStatus();
  console.log(
    JSON.stringify(
      {
        companyId: after.companyId || before.companyId,
        webhookId: result.id,
        url: result.url,
        created: result.created,
        nativeWebhook: after.nativeWebhook,
        secret: result.secret,
        secretLast4: result.secretLast4,
        connectUrl: result.connectUrl,
        note: result.created
          ? "Paste secret into Klaviyo → Stripe → Verify Stripe webhooks."
          : "Stripe already posts charge/invoice events to Klaviyo. Re-run with --rotate to mint a new signing secret.",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

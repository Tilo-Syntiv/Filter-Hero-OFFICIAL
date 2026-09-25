import "dotenv/config";
import fs from "node:fs";
import {
  getKlaviyoAccount,
  resolveMarketingListId,
  trackKlaviyoEvent,
  upsertKlaviyoProfile,
} from "../server/klaviyo.ts";

function setEnv(key: string, value: string) {
  const path = ".env";
  let text = fs.readFileSync(path, "utf8");
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) text = text.replace(re, line);
  else text = `${text.trimEnd()}\n${line}\n`;
  fs.writeFileSync(path, text);
}

async function main() {
  const account = await getKlaviyoAccount();
  if (!account.ok) {
    console.error("account_failed", account.error);
    process.exit(1);
  }
  if (account.publicKey) setEnv("KLAVIYO_PUBLIC_API_KEY", account.publicKey);
  const listId = await resolveMarketingListId();
  if (listId) setEnv("KLAVIYO_LIST_ID", listId);

  const email = "klaviyo-wire-check@filterhero.net";
  const profile = await upsertKlaviyoProfile({
    email,
    firstName: "Filter",
    lastName: "Hero",
    properties: { source: "live-wire-check" },
  });
  const event = await trackKlaviyoEvent({
    metric: "Viewed Product",
    email,
    uniqueId: `wire-check:${Date.now()}`,
    properties: {
      ProductName: "20x25x1 MERV 8",
      ProductID: "check",
      Size: "20x25x1",
      MERV: "8",
      Brand: "Filter Hero",
    },
  });

  console.log(
    JSON.stringify(
      {
        organization: account.organization || null,
        accountId: account.accountId || null,
        testAccount: Boolean(account.test),
        publicKey: account.publicKey || null,
        listId,
        profileOk: profile.ok,
        profileError: profile.error || null,
        eventOk: event.ok,
        eventError: event.error || null,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

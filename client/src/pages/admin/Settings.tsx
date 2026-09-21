import { useMemo, useState } from "react";
import AdminShell from "./AdminShell";
import { useAdminLoad } from "./use-admin-load";
import { AdminError, AdminLoading, AdminPanel, StatusDot } from "./ui";
import { Button } from "@/components/ui/button";
import {
  connectKlaviyoStripe,
  disconnectIntuit,
  getAdminSettings,
  startIntuitConnect,
} from "@/lib/admin-api";
import { staffMessageFor, type OauthErrorKind } from "@shared/intuit-oauth";

const OAUTH_KINDS = new Set<OauthErrorKind>([
  "expired_access_token",
  "expired_refresh_token",
  "invalid_grant",
  "csrf",
  "oauth_denied",
  "other",
]);

function intuitNotice(): { tone: "ok" | "error"; text: string } | null {
  const kind = new URLSearchParams(window.location.search).get("intuit");
  if (!kind) return null;
  if (kind === "connected") {
    return { tone: "ok", text: "QuickBooks is connected." };
  }
  if (OAUTH_KINDS.has(kind as OauthErrorKind)) {
    return { tone: "error", text: staffMessageFor(kind as OauthErrorKind) };
  }
  return { tone: "error", text: "QuickBooks could not complete that request." };
}

export default function AdminSettings() {
  return <AdminShell title="Settings">{() => <SettingsBody />}</AdminShell>;
}

function SettingsBody() {
  const { data, error, loading, reload } = useAdminLoad(getAdminSettings);
  const notice = useMemo(intuitNotice, []);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [copiedUri, setCopiedUri] = useState(false);
  const [klaviyoNote, setKlaviyoNote] = useState("");

  if (loading) return <AdminLoading />;
  if (error) return <AdminError>{error}</AdminError>;
  if (!data) return null;

  const stripeTax = data.stripeTax ?? {
    configured: false,
    settingsStatus: null,
    automaticTax: false,
    collecting: false,
    headOfficeReady: false,
    registrations: [],
  };

  const integrations = [
    ["Stripe secret", data.integrations.stripe],
    ["Stripe publishable", data.integrations.stripePublishable],
    ["Stripe webhook", data.integrations.stripeWebhook],
    ["Klaviyo private", data.integrations.klaviyoPrivate],
    ["Klaviyo public", data.integrations.klaviyoPublic],
    ["Klaviyo list", data.integrations.klaviyoList],
    ["Resend", data.integrations.resend],
    ["Supabase", data.integrations.supabase],
    ["Turnstile", data.integrations.turnstile],
    ["QuickBooks keys", data.integrations.intuit],
  ] as const;

  const connectKlaviyo = async () => {
    setBusy(true);
    setActionError("");
    setKlaviyoNote("");
    try {
      const next = await connectKlaviyoStripe();
      await reload();
      setKlaviyoNote(
        next.secret
          ? `Paste this Stripe signing secret into Klaviyo: ${next.secret}`
          : next.created && next.secretLast4
            ? `Stripe webhook ${next.id} created (secret last4 ${next.secretLast4}). Finish Connect in Klaviyo and paste that signing secret.`
            : "Stripe already posts charge and invoice events to Klaviyo. Finish Connect in Klaviyo if the app is not installed.",
      );
      window.open(next.connectUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not connect Klaviyo to Stripe.");
    } finally {
      setBusy(false);
    }
  };

  const connect = async () => {
    setBusy(true);
    setActionError("");
    try {
      const next = await startIntuitConnect();
      window.location.assign(next.url);
    } catch (err) {
      setBusy(false);
      setActionError(err instanceof Error ? err.message : "Could not start QuickBooks connect.");
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setActionError("");
    try {
      await disconnectIntuit();
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not disconnect QuickBooks.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {notice ? (
        <p
          className={
            notice.tone === "ok"
              ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-navy"
              : "rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive"
          }
        >
          {notice.text}
        </p>
      ) : null}
      {actionError ? (
        <p className="text-sm font-semibold text-destructive">{actionError}</p>
      ) : null}

      <AdminPanel title="Site">
        <dl className="space-y-2 text-sm">
          <Row label="Canonical URL" value={data.siteUrl} />
          <Row label="Client URL" value={data.clientUrl} />
          <Row
            label="Catalog"
            value={data.catalog.sellableOnly ? "Sellable sheet only" : "Full archive"}
          />
          <Row label="CRM kill switch" value={data.flags.crmDisable ? "CRM_DISABLE=1" : "Off"} />
          <Row
            label="Accounts kill switch"
            value={data.flags.accountDisable ? "ACCOUNT_DISABLE=1" : "Off"}
          />
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Env flags are read-only here. Change them in Railway / .env and restart.
          Homepage copy and featured sizes are under Content.
        </p>
      </AdminPanel>

      {klaviyoNote ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-navy">
          {klaviyoNote}
        </p>
      ) : null}

      <AdminPanel
        title="Klaviyo + Stripe"
        action={
          <Button
            size="sm"
            className="text-white"
            disabled={busy || !data.klaviyoStripe.configured}
            onClick={() => void connectKlaviyo()}
          >
            {data.klaviyoStripe.nativeWebhook ? "Open Klaviyo" : "Connect"}
          </Button>
        }
      >
        <div className="space-y-2 text-sm">
          <StatusDot ok={data.klaviyoStripe.shopEvents} label="Shop events (Placed Order via Filter Hero webhook)" />
          <StatusDot ok={data.klaviyoStripe.nativeWebhook} label="Native charge and invoice webhook" />
          <StatusDot
            ok={data.klaviyoStripe.oauthAccountMatch}
            label="Stripe key is FILTER HERO (Klaviyo OAuth), not sandbox"
          />
          <StatusDot
            ok={!data.klaviyoStripe.fulfillmentConflict}
            label="This key does not post Checkout to filterhero.net unless it is FILTER HERO live"
          />
          <StatusDot
            ok={!data.klaviyoStripe.nativeConflict}
            label="This key does not host a leftover Klaviyo webhook on sandbox"
          />
          {data.klaviyoStripe.url ? (
            <p className="break-all text-muted-foreground">{data.klaviyoStripe.url}</p>
          ) : (
            <p className="text-muted-foreground">
              Set Stripe and Klaviyo keys, then Connect. Refunds and failed payments use Klaviyo’s Stripe app.
            </p>
          )}
          {data.klaviyoStripe.stripeAccountName || data.klaviyoStripe.stripeAccountId ? (
            <p className="text-xs text-muted-foreground">
              This key is {data.klaviyoStripe.stripeAccountName || "Stripe"}
              {data.klaviyoStripe.webhookId ? ` · ${data.klaviyoStripe.webhookId}` : ""}. Klaviyo Connect to Stripe must
              pick FILTER HERO (created Aug 28), not FILTER HERO sandbox.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Do not add an order-confirmation or replenish flow on Successfully Paid. Resend + Stripe already send the
            receipt. Replenish stays on Placed Order.
          </p>
        </div>
      </AdminPanel>

      <AdminPanel title="Stripe Tax">
        <div className="space-y-2 text-sm">
          <StatusDot ok={stripeTax.headOfficeReady} label="Head office set (Tax Settings active)" />
          <StatusDot ok={stripeTax.automaticTax} label="Checkout automatic tax" />
          <StatusDot
            ok={stripeTax.collecting}
            label="At least one collecting registration"
          />
          {stripeTax.registrations.length ? (
            <p className="text-muted-foreground">
              Collecting:{" "}
              {stripeTax.registrations
                .filter((row) => row.status === "active")
                .map((row) => (row.state ? `${row.country}-${row.state}` : row.country))
                .join(", ") || "none"}
            </p>
          ) : (
            <p className="text-muted-foreground">
              Add each state where you are already registered. Stripe Tax charges $0 until a
              registration matches the ship-to address.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            QuickBooks should record the tax Stripe already collected. Do not let Automated Sales Tax
            recalculate the same sale.
          </p>
        </div>
      </AdminPanel>

      <AdminPanel
        title="QuickBooks Online"
        action={
          data.intuit.connected ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void disconnect()}>
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-white"
              disabled={busy || !data.intuit.configured}
              onClick={() => void connect()}
            >
              {data.intuit.needsReauthorize ? "Connect again" : "Connect"}
            </Button>
          )
        }
      >
        <div className="space-y-2 text-sm">
          <StatusDot ok={data.intuit.configured} label="Client ID and secret" />
          <StatusDot ok={data.intuit.connected} label="Connected company" />
          {data.intuit.environment ? (
            <p className="text-muted-foreground">
              Environment: {data.intuit.environment}
              {data.intuit.realmId ? ` · realm ${data.intuit.realmId}` : ""}
            </p>
          ) : (
            <p className="text-muted-foreground">
              Set INTUIT_CLIENT_ID and INTUIT_CLIENT_SECRET to connect a company.
            </p>
          )}
          {data.intuit.redirectUri ? (
            <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
              <p className="font-medium text-navy">Redirect URI Intuit must list</p>
              <p className="text-xs text-muted-foreground">
                App dashboard → FILTER HERO → Keys &amp; OAuth →{" "}
                {data.intuit.environment === "production" ? "Production" : "Development"}{" "}
                → Redirect URIs → Add URI. Paste this exactly, then Save.
                {data.intuit.environment === "production"
                  ? " Localhost is not allowed on Production keys."
                  : " Production cannot use localhost."}
              </p>
              <code className="block break-all rounded-lg bg-white px-2 py-1.5 text-xs text-navy">
                {data.intuit.redirectUri}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(data.intuit.redirectUri || "").then(() => {
                    setCopiedUri(true);
                    window.setTimeout(() => setCopiedUri(false), 2000);
                  });
                }}
              >
                {copiedUri ? "Copied" : "Copy URI"}
              </Button>
            </div>
          ) : null}
          {data.intuit.needsReauthorize ? (
            <p className="font-semibold text-destructive">
              {staffMessageFor(
                data.intuit.lastError === "invalid_grant"
                  ? "invalid_grant"
                  : "expired_refresh_token",
              )}
            </p>
          ) : null}
        </div>
      </AdminPanel>

      <AdminPanel title="Integrations">
        <div className="grid gap-2 sm:grid-cols-2">
          {integrations.map(([label, ok]) => (
            <StatusDot key={label} ok={Boolean(ok)} label={label} />
          ))}
        </div>
        {data.integrations.resendFrom ? (
          <p className="mt-3 text-sm text-muted-foreground">From {String(data.integrations.resendFrom)}</p>
        ) : null}
        {data.integrations.contactTo ? (
          <p className="text-sm text-muted-foreground">Lead alerts to {String(data.integrations.contactTo)}</p>
        ) : null}
      </AdminPanel>

      <AdminPanel title="External consoles">
        <ul className="space-y-2 text-sm">
          <li>
            <a className="font-semibold text-primary" href={data.links.stripe} target="_blank" rel="noreferrer">
              Stripe Dashboard
            </a>
          </li>
          <li>
            <a
              className="font-semibold text-primary"
              href={data.links.stripeTaxSettings}
              target="_blank"
              rel="noreferrer"
            >
              Stripe Tax settings
            </a>
          </li>
          <li>
            <a
              className="font-semibold text-primary"
              href={data.links.stripeTax}
              target="_blank"
              rel="noreferrer"
            >
              Stripe Tax registrations
            </a>
          </li>
          <li>
            <a className="font-semibold text-primary" href={data.links.klaviyo} target="_blank" rel="noreferrer">
              Klaviyo
            </a>
          </li>
          <li>
            <a className="font-semibold text-primary" href={data.links.resend} target="_blank" rel="noreferrer">
              Resend
            </a>
          </li>
        </ul>
      </AdminPanel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-navy">{value}</dd>
    </div>
  );
}

import AdminShell from "./AdminShell";
import { useAdminLoad } from "./use-admin-load";
import { AdminError, AdminLoading, AdminPanel, StatusDot } from "./ui";
import { getAdminHealth, getAdminTracking } from "@/lib/admin-api";

export default function AdminTracking() {
  return <AdminShell title="Tracking">{() => <TrackingBody />}</AdminShell>;
}

function TrackingBody() {
  const tracking = useAdminLoad(getAdminTracking);
  const health = useAdminLoad(getAdminHealth);

  if (tracking.loading) return <AdminLoading />;
  if (tracking.error) return <AdminError>{tracking.error}</AdminError>;
  if (!tracking.data) return null;

  const klaviyo = health.data?.klaviyo;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AdminPanel title="Klaviyo">
        {klaviyo ? (
          <div className="space-y-2">
            <StatusDot ok={klaviyo.enabled} label="API" />
            <StatusDot ok={klaviyo.publicKey} label="Onsite key" />
            <StatusDot ok={klaviyo.listConfigured} label="Marketing list" />
            {klaviyo.account ? (
              <p className="text-sm text-muted-foreground">Account {klaviyo.account}</p>
            ) : null}
            {klaviyo.error ? (
              <p className="text-sm text-destructive">{klaviyo.error}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Checking Klaviyo…</p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Flows, segments, and campaign analytics stay in Klaviyo. This console
          does not send marketing mail.
        </p>
        <a
          className="mt-3 inline-block text-sm font-semibold text-primary"
          href="https://www.klaviyo.com/dashboard"
          target="_blank"
          rel="noreferrer"
        >
          Open Klaviyo
        </a>
      </AdminPanel>

      <AdminPanel title="Channels">
        <dl className="space-y-3 text-sm">
          {Object.entries(tracking.data.channels).map(([name, detail]) => (
            <div key={name}>
              <dt className="font-semibold capitalize text-navy">{name}</dt>
              <dd className="text-muted-foreground">{detail}</dd>
            </div>
          ))}
        </dl>
      </AdminPanel>

      <AdminPanel title="Browser metrics">
        <ul className="space-y-1 text-sm text-navy">
          {tracking.data.clientMetrics.map((metric) => (
            <li key={metric}>{metric}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Posted to {tracking.data.trackPath} after identify at {tracking.data.identifyPath}.
        </p>
      </AdminPanel>

      <AdminPanel title="Server events">
        <ul className="space-y-1 text-sm text-navy">
          {tracking.data.serverEvents.map((metric) => (
            <li key={metric}>{metric}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Catalog feed: {tracking.data.catalogFeed}
        </p>
      </AdminPanel>
    </div>
  );
}

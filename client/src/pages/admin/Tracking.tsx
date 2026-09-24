import AdminShell from "./AdminShell";
import { useAdminLoad } from "./use-admin-load";
import { AdminError, AdminLoading, AdminPanel } from "./ui";
import { getAdminTracking } from "@/lib/admin-api";

export default function AdminTracking() {
  return <AdminShell title="Tracking">{() => <TrackingBody />}</AdminShell>;
}

function TrackingBody() {
  const tracking = useAdminLoad(getAdminTracking);

  if (tracking.loading) return <AdminLoading />;
  if (tracking.error) return <AdminError>{tracking.error}</AdminError>;
  if (!tracking.data) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
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
    </div>
  );
}

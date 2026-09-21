import AdminShell from "./AdminShell";
import { useAdminLoad } from "./use-admin-load";
import {
  AdminError,
  AdminLoading,
  AdminPanel,
  AdminTable,
  StatusDot,
} from "./ui";
import { formatDateTime, getAdminSecurity } from "@/lib/admin-api";

export default function AdminSecurity() {
  return <AdminShell title="Security">{() => <SecurityBody />}</AdminShell>;
}

function SecurityBody() {
  const { data, error, loading } = useAdminLoad(getAdminSecurity);
  if (loading) return <AdminLoading />;
  if (error) return <AdminError>{error}</AdminError>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Access">
          <div className="space-y-2">
            <StatusDot ok={data.auth.supabaseUrl} label="Supabase URL" />
            <StatusDot ok={data.auth.anonKey} label="Anon key" />
            <StatusDot ok={data.auth.serviceRole} label="Service role" />
            <StatusDot ok={data.auth.staffAllowlist > 0} label="Staff allowlist" />
            <p className="pt-2 text-sm text-muted-foreground">
              {data.auth.staffAllowlist} inbox{data.auth.staffAllowlist === 1 ? "" : "es"} on
              STAFF_EMAILS. Production: {data.production ? "yes" : "no"}.
            </p>
          </div>
        </AdminPanel>
        <AdminPanel title="Bot and headers">
          <div className="space-y-2">
            <StatusDot ok={data.turnstile.secret} label="Turnstile secret" />
            <StatusDot ok={data.turnstile.siteKey} label="Turnstile site key" />
            <StatusDot ok={data.hsts} label="HSTS" />
            <p className="pt-2 text-sm text-muted-foreground">{data.rls}</p>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="Rate limits">
        <AdminTable headers={["Surface", "Window", "Max"]}>
          {data.rateLimits.map((row) => (
            <tr key={row.name} className="border-b last:border-0">
              <td className="px-2 py-2 font-medium text-navy">{row.name}</td>
              <td className="px-2 py-2">{row.window}</td>
              <td className="px-2 py-2">{row.max}</td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>

      <AdminPanel title="Response headers">
        <ul className="grid gap-1 text-sm text-navy sm:grid-cols-2">
          {data.headers.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </AdminPanel>

      <AdminPanel title="Audit log">
        {!data.audit.enabled ? (
          <p className="text-sm text-muted-foreground">CRM audit log is unavailable.</p>
        ) : data.audit.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No staff mutations recorded yet.</p>
        ) : (
          <AdminTable headers={["When", "Who", "Action", "Entity"]}>
            {data.audit.rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-2 py-2 text-muted-foreground">{formatDateTime(row.at)}</td>
                <td className="px-2 py-2">{row.actor_email || "—"}</td>
                <td className="px-2 py-2 font-medium text-navy">{row.action}</td>
                <td className="px-2 py-2 text-muted-foreground">
                  {row.entity}
                  {row.entity_id ? ` · ${row.entity_id.slice(0, 8)}` : ""}
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminPanel>

      <AdminPanel title="Rules">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {data.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </AdminPanel>
    </div>
  );
}

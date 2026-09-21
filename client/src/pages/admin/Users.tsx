import AdminShell from "./AdminShell";
import { useAdminLoad } from "./use-admin-load";
import { AdminError, AdminLoading, AdminPanel, MailLink } from "./ui";
import { getAdminStaff } from "@/lib/admin-api";

export default function AdminUsers() {
  return <AdminShell title="Staff">{() => <UsersBody />}</AdminShell>;
}

function UsersBody() {
  const { data, error, loading } = useAdminLoad(getAdminStaff);
  if (loading) return <AdminLoading />;
  if (error) return <AdminError>{error}</AdminError>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <AdminPanel title={`${data.emails.length} allowlisted inboxes`}>
        {data.emails.length === 0 ? (
          <p className="text-sm text-destructive">STAFF_EMAILS is empty. Nobody can use this console.</p>
        ) : (
          <ul className="divide-y">
            {data.emails.map((email) => (
              <li key={email} className="flex items-center justify-between py-2 text-sm">
                <MailLink email={email} />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Staff</span>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
      <AdminPanel title="How access works">
        <p className="text-sm leading-relaxed text-muted-foreground">{data.note}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Source: <code>{data.source}</code>. There is no RBAC table on purpose — a second
          staff tier would still share the same mailbox reputation rules.
        </p>
      </AdminPanel>
    </div>
  );
}

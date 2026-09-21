import { Link } from "wouter";
import AdminShell from "./AdminShell";
import { useAdminLoad } from "./use-admin-load";
import { AdminError, AdminLoading, AdminPanel, StatCard, StatusDot } from "./ui";
import {
  formatCents,
  formatDate,
  formatDateTime,
  getAdminHealth,
  getOverview,
} from "@/lib/admin-api";

export default function AdminOverview() {
  return <AdminShell title="Overview">{() => <OverviewBody />}</AdminShell>;
}

function OverviewBody() {
  const overview = useAdminLoad(getOverview);
  const health = useAdminLoad(getAdminHealth);

  if (overview.loading) return <AdminLoading />;
  if (overview.error) return <AdminError>{overview.error}</AdminError>;
  if (!overview.data) return null;

  const data = overview.data;
  const status = health.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatCents(data.revenue.all)}
          hint={`${formatCents(data.revenue.last30)} last 30 days`}
        />
        <StatCard
          label="Orders"
          value={data.orders.count}
          hint={`${data.orders.last7} in the last week`}
        />
        <StatCard
          label="Open quotes"
          value={data.pipeline.open}
          hint={
            data.pipeline.overdue
              ? `${data.pipeline.overdue} overdue`
              : "Nothing overdue"
          }
          tone={data.pipeline.overdue ? "danger" : "ok"}
        />
        <StatCard
          label="Leads"
          value={data.leads.count}
          hint={`${data.leads.quotes} quotes · ${data.leads.support} support`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminPanel
          title="Quote pipeline"
          action={
            <Link href="/admin/quotes" className="text-xs font-semibold text-primary">
              Open board
            </Link>
          }
        >
          {data.pipeline.enabled ? (
            <ul className="space-y-2">
              {data.pipeline.byStage.map((stage) => (
                <li key={stage.id} className="flex items-center justify-between text-sm">
                  <span className="text-navy">{stage.label}</span>
                  <span className="font-semibold text-navy">{stage.count}</span>
                </li>
              ))}
              {data.pipeline.unscheduled > 0 ? (
                <li className="pt-2 text-xs font-semibold text-amber-700">
                  {data.pipeline.unscheduled} unscheduled next actions
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">CRM is off.</p>
          )}
        </AdminPanel>

        <AdminPanel title="Catalog">
          <dl className="space-y-2 text-sm">
            <Row label="Sellable SKUs" value={String(data.catalog.skus)} />
            <Row label="Sizes on sale" value={String(data.catalog.sellableSizes)} />
            <Row label="Archive sizes" value={String(data.catalog.archivedSizes)} />
            <Row label="HVAC brands" value={String(data.catalog.brands)} />
            <Row
              label="Catalog mode"
              value={data.catalog.sellableOnly ? "Sellable sheet" : "Full archive"}
            />
          </dl>
        </AdminPanel>

        <AdminPanel
          title="Systems"
          action={
            <Link href="/admin/security" className="text-xs font-semibold text-primary">
              Security
            </Link>
          }
        >
          {status ? (
            <div className="space-y-2">
              <StatusDot ok={status.crm.enabled && status.crm.reachable} label="CRM" />
              <StatusDot
                ok={status.account.enabled && status.account.reachable}
                label="Accounts"
              />
              <StatusDot ok={status.klaviyo.enabled} label="Klaviyo" />
              <StatusDot ok={status.stripe.configured} label="Stripe" />
              <StatusDot ok={status.resend.configured} label="Resend" />
            </div>
          ) : health.error ? (
            <p className="text-sm text-destructive">{health.error}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Checking services…</p>
          )}
        </AdminPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel
          title="Recent orders"
          action={
            <Link href="/admin/orders" className="text-xs font-semibold text-primary">
              View all
            </Link>
          }
        >
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid orders yet.</p>
          ) : (
            <ul className="divide-y">
              {data.recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-navy">
                      {order.customerEmail || "Guest"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.paidAt)}</p>
                  </div>
                  <span className="font-semibold text-navy">
                    {formatCents(order.amountTotal, order.currency ?? "usd")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel
          title="Recent leads"
          action={
            <Link href="/admin/contacts" className="text-xs font-semibold text-primary">
              Contacts
            </Link>
          }
        >
          {data.recentLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No form submissions yet.</p>
          ) : (
            <ul className="divide-y">
              {data.recentLeads.map((lead) => (
                <li key={lead.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-navy">{lead.name}</p>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {lead.intent}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lead.email} · {formatDateTime(lead.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-navy">{value}</dd>
    </div>
  );
}

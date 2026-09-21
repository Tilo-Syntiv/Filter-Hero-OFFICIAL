import { useState } from "react";
import { Link } from "wouter";
import AdminShell from "./AdminShell";
import { useAdminLoad } from "./use-admin-load";
import {
  AdminError,
  AdminLoading,
  AdminPanel,
  AdminSearch,
  AdminTable,
  EmptyState,
  MailLink,
  PersonName,
} from "./ui";
import { formatCents, formatDate, getAdminCustomer, listAdminCustomers } from "@/lib/admin-api";

export default function AdminCustomers() {
  return <AdminShell title="Customers">{() => <CustomersBody />}</AdminShell>;
}

export function AdminCustomerDetail({ id }: { id: string }) {
  return <AdminShell title="Customer">{() => <CustomerDetailBody id={id} />}</AdminShell>;
}

function CustomersBody() {
  const [query, setQuery] = useState("");
  const { data, error, loading } = useAdminLoad(() => listAdminCustomers(query), [query]);

  if (loading) return <AdminLoading />;
  if (error) return <AdminError>{error}</AdminError>;
  if (!data?.enabled) {
    return <p className="text-sm text-muted-foreground">Customer accounts are off.</p>;
  }

  return (
    <div className="space-y-4">
      <AdminSearch value={query} onChange={setQuery} placeholder="Search shopper email or name" />
      <AdminPanel title={`${data.rows.length} accounts`}>
        {data.rows.length === 0 ? (
          <EmptyState>No customer profiles yet.</EmptyState>
        ) : (
          <AdminTable headers={["Name", "Email", "Orders", "Spent", "Joined"]}>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-muted/40">
                <td className="px-2 py-2 font-medium text-navy">
                  <Link href={`/admin/customers/${row.id}`}>
                    {PersonName({
                      first: row.first_name,
                      last: row.last_name,
                      email: row.email,
                    })}
                  </Link>
                </td>
                <td className="px-2 py-2">
                  <MailLink email={row.email} />
                </td>
                <td className="px-2 py-2">{row.orderCount}</td>
                <td className="px-2 py-2 font-semibold">{formatCents(row.spent)}</td>
                <td className="px-2 py-2 text-muted-foreground">{formatDate(row.created_at)}</td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminPanel>
    </div>
  );
}

function CustomerDetailBody({ id }: { id: string }) {
  const { data, error, loading } = useAdminLoad(() => getAdminCustomer(id), [id]);
  if (loading) return <AdminLoading />;
  if (error) return <AdminError>{error}</AdminError>;
  if (!data) return <AdminError>Customer not found.</AdminError>;
  const { profile, filters, orders } = data;

  return (
    <div className="space-y-4">
      <Link href="/admin/customers" className="text-sm text-muted-foreground hover:text-navy">
        ← All customers
      </Link>
      <div className="grid gap-4 lg:grid-cols-3">
        <AdminPanel title="Profile" className="lg:col-span-2">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Name</dt>
              <dd className="text-navy">
                {PersonName({
                  first: profile.first_name,
                  last: profile.last_name,
                  email: profile.email,
                })}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Email</dt>
              <dd>
                <MailLink email={profile.email} />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Phone</dt>
              <dd>{profile.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Address</dt>
              <dd>
                {[profile.address_line1, profile.city, profile.region, profile.postal_code]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </dd>
            </div>
          </dl>
        </AdminPanel>
        <AdminPanel title="Saved filters">
          {filters.length === 0 ? (
            <p className="text-sm text-muted-foreground">None saved.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {filters.map((filter) => (
                <li key={filter.id}>
                  <span className="font-medium text-navy">{filter.size}</span>{" "}
                  <span className="text-muted-foreground">MERV {filter.merv}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>
      <AdminPanel title="Orders">
        {orders.length === 0 ? (
          <EmptyState>No matching paid orders.</EmptyState>
        ) : (
          <AdminTable headers={["Paid", "Total", "Items"]}>
            {orders.map((order) => (
              <tr key={order.id} className="border-b last:border-0">
                <td className="px-2 py-2">{formatDate(order.paidAt)}</td>
                <td className="px-2 py-2 font-semibold">
                  {formatCents(order.amountTotal, order.currency ?? "usd")}
                </td>
                <td className="px-2 py-2 text-muted-foreground">
                  {order.items.map((item) => `${item.quantity}× ${item.size ?? item.productId}`).join(", ")}
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminPanel>
    </div>
  );
}

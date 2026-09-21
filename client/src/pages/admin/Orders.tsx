import { Fragment, useState } from "react";
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
} from "./ui";
import { formatCents, formatDateTime, listAdminOrders } from "@/lib/admin-api";

export default function AdminOrders() {
  return <AdminShell title="Orders">{() => <OrdersBody />}</AdminShell>;
}

function OrdersBody() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, error, loading } = useAdminLoad(() => listAdminOrders(query), [query]);

  if (loading) return <AdminLoading />;
  if (error) return <AdminError>{error}</AdminError>;

  return (
    <div className="space-y-4">
      <AdminSearch value={query} onChange={setQuery} placeholder="Search email, size, or session" />
      <AdminPanel title={`${data?.length ?? 0} paid orders`}>
        {!data?.length ? (
          <EmptyState>No orders in orders.json yet.</EmptyState>
        ) : (
          <AdminTable headers={["Paid", "Customer", "Total", "Items", "Where"]}>
            {data.map((order) => (
              <Fragment key={order.id}>
                <tr
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  onClick={() => setOpenId(openId === order.id ? null : order.id)}
                >
                  <td className="px-2 py-2 text-muted-foreground">
                    {formatDateTime(order.paidAt)}
                  </td>
                  <td className="px-2 py-2">
                    {order.customerEmail ? (
                      <MailLink email={order.customerEmail} />
                    ) : (
                      "Guest"
                    )}
                  </td>
                  <td className="px-2 py-2 font-semibold text-navy">
                    {formatCents(order.amountTotal, order.currency ?? "usd")}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {[order.shippingCity, order.shippingRegion].filter(Boolean).join(", ") || "—"}
                  </td>
                </tr>
                {openId === order.id ? (
                  <tr className="border-b bg-muted/30">
                    <td colSpan={5} className="px-3 py-3 text-sm">
                      <p className="text-xs text-muted-foreground">
                        {order.sessionId}
                        {order.invoiceId ? ` · invoice ${order.invoiceId}` : ""}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {order.items.map((item) => (
                          <li key={`${order.id}-${item.productId}`}>
                            {item.quantity}× {item.name || item.size || `#${item.productId}`}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </AdminTable>
        )}
      </AdminPanel>
    </div>
  );
}

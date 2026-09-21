import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import AdminShell from "./AdminShell";
import { useAdminLoad } from "./use-admin-load";
import { AdminError, AdminLoading, AdminPanel, AdminTable, StatCard } from "./ui";
import { formatCents, getAdminAnalytics } from "@/lib/admin-api";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export default function AdminAnalytics() {
  return <AdminShell title="Analytics">{() => <AnalyticsBody />}</AdminShell>;
}

function AnalyticsBody() {
  const { data, error, loading } = useAdminLoad(getAdminAnalytics);
  if (loading) return <AdminLoading />;
  if (error) return <AdminError>{error}</AdminError>;
  if (!data) return null;

  const revenueConfig = {
    revenue: { label: "Revenue", color: "#203868" },
  };
  const leadConfig = {
    quotes: { label: "Quotes", color: "#203868" },
    support: { label: "Support", color: "#64748b" },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders" value={data.orderCount} />
        <StatCard label="Average order" value={formatCents(data.aov)} />
        <StatCard label="Leads" value={data.leadCount} />
        <StatCard
          label="Quote share"
          value={
            data.leadCount
              ? `${Math.round((data.intent.quote / data.leadCount) * 100)}%`
              : "—"
          }
        />
      </div>

      <AdminPanel title="Revenue · last 30 days">
        <ChartContainer config={revenueConfig} className="h-64 w-full aspect-auto">
          <LineChart data={data.revenueByDay}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={(value) => `$${Math.round(Number(value) / 100)}`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              dataKey="revenue"
              type="monotone"
              stroke="var(--color-revenue)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </AdminPanel>

      <AdminPanel title="Form volume · last 30 days">
        <ChartContainer config={leadConfig} className="h-64 w-full aspect-auto">
          <BarChart data={data.leadsByDay}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="quotes" fill="var(--color-quotes)" radius={4} />
            <Bar dataKey="support" fill="var(--color-support)" radius={4} />
          </BarChart>
        </ChartContainer>
      </AdminPanel>

      <AdminPanel title="Top sizes from paid orders">
        {data.topSizes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No paid orders to rank yet.</p>
        ) : (
        <AdminTable headers={["Size", "Units", "Est. revenue"]}>
          {data.topSizes.map((row) => (
            <tr key={row.size} className="border-b last:border-0">
              <td className="px-2 py-2 font-medium text-navy">{row.size}</td>
              <td className="px-2 py-2">{row.quantity}</td>
              <td className="px-2 py-2">{formatCents(row.revenue)}</td>
            </tr>
          ))}
        </AdminTable>
        )}
      </AdminPanel>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, CalendarOff } from "lucide-react";
import AdminShell from "./AdminShell";
import {
  ApiError,
  dealAmount,
  formatDate,
  formatMoney,
  isOverdue,
  isUnscheduled,
  listDeals,
  listStages,
  type Deal,
  type Stage,
} from "@/lib/admin-api";

/**
 * The Quotes board: one column per stage, deals sorted by next action.
 *
 * The whole point of this screen is the two flags. A quote with a next action
 * in the past, or none at all, is one that is quietly dying — that was the
 * failure mode when leads only reached an inbox (FH-176).
 */
export default function AdminBoard() {
  return (
    <AdminShell title="Quotes">
      {() => <BoardBody />}
    </AdminShell>
  );
}

function BoardBody() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listStages(), listDeals()])
      .then(([nextStages, nextDeals]) => {
        if (cancelled) return;
        setStages(nextStages);
        setDeals(nextDeals);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "crm_disabled") {
          setError(
            "CRM is off. Paste SUPABASE_SERVICE_ROLE_KEY into .env (Settings → API → service_role) and restart the server.",
          );
          return;
        }
        setError(err instanceof Error ? err.message : "Load failed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const deal of deals) map.get(deal.stage_id)?.push(deal);
    return map;
  }, [stages, deals]);

  const needsAttention = deals.filter((deal) => isOverdue(deal)).length;

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          {deals.length} {deals.length === 1 ? "deal" : "deals"}
        </span>
        {needsAttention > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 font-semibold text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            {needsAttention} overdue
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stages.map((stage) => {
          const column = byStage.get(stage.id) ?? [];
          return (
            <section key={stage.id} className="rounded-2xl bg-white p-3 shadow-sm">
              <header className="flex items-baseline justify-between">
                <h2 className="text-sm font-bold text-navy">{stage.label}</h2>
                <span className="text-xs text-muted-foreground">{column.length}</span>
              </header>
              <div className="mt-3 space-y-2">
                {column.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Empty
                  </p>
                ) : (
                  column.map((deal) => <DealCard key={deal.id} deal={deal} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const overdue = isOverdue(deal);
  const unscheduled = isUnscheduled(deal);
  return (
    <Link
      href={`/admin/deals/${deal.id}`}
      className={`block rounded-xl border p-3 transition hover:border-primary/50 ${
        overdue ? "border-destructive/40 bg-destructive/5" : "border-border bg-white"
      }`}
    >
      <p className="text-sm font-semibold leading-snug text-navy">{deal.name}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {formatMoney(dealAmount(deal))}
        </span>
        {overdue ? (
          <span className="inline-flex items-center gap-1 font-semibold text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {formatDate(deal.next_action_at)}
          </span>
        ) : unscheduled ? (
          <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
            <CalendarOff className="h-3 w-3" />
            No next action
          </span>
        ) : (
          <span className="text-muted-foreground">
            {formatDate(deal.next_action_at)}
          </span>
        )}
      </div>
    </Link>
  );
}

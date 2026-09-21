import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import AdminShell from "./AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addNote,
  dealAmount,
  formatDate,
  formatMoney,
  getDealDetail,
  isOverdue,
  listStages,
  patchDeal,
  type DealDetail as DealDetailData,
  type Stage,
} from "@/lib/admin-api";

export default function AdminDealDetail({ id }: { id: string }) {
  return <AdminShell title="Deal">{() => <DetailBody id={id} />}</AdminShell>;
}

function DetailBody({ id }: { id: string }) {
  const [detail, setDetail] = useState<DealDetailData | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  const load = () =>
    Promise.all([getDealDetail(id), listStages()]).then(([next, nextStages]) => {
      setDetail(next);
      setStages(nextStages);
    });

  useEffect(() => {
    let cancelled = false;
    void load().catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Load failed.");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const apply = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      await patchDeal(id, patch);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const submitNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    try {
      await addNote(id, note.trim());
      setNote("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save note.");
    } finally {
      setSaving(false);
    }
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!detail) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const { deal, contact, activities } = detail;
  const overdue = isOverdue(deal);

  return (
    <>
      <Link
        href="/admin/quotes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to board
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-navy">{deal.name}</h2>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              {deal.source.replace(/_/g, " ")} · opened {formatDate(deal.created_at)}
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <select
                  id="stage"
                  value={deal.stage_id}
                  disabled={saving}
                  onChange={(event) => void apply({ stageId: event.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>

              <AmountField
                value={dealAmount(deal)}
                disabled={saving}
                onSave={(amount) => void apply({ amount })}
              />

              <NextActionField
                value={deal.next_action_at}
                overdue={overdue}
                disabled={saving || Boolean(deal.closed_at)}
                onSave={(nextActionAt) => void apply({ nextActionAt })}
              />
            </div>

            {deal.closed_at ? (
              <p className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-sm">
                Closed {formatDate(deal.closed_at)}
                {deal.lost_reason ? ` — ${deal.lost_reason}` : ""}
              </p>
            ) : (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={() => void apply({ stageId: "won" })}
                >
                  Close won
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    const reason = window.prompt("Why was this lost?")?.trim();
                    if (reason === undefined) return;
                    void apply({ stageId: "lost", lostReason: reason || null });
                  }}
                >
                  Close lost
                </Button>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-navy">Activity</h3>
            <form onSubmit={submitNote} className="mt-3 space-y-2">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What happened on this quote?"
                rows={3}
              />
              <Button type="submit" size="sm" disabled={saving || !note.trim()}>
                Add note
              </Button>
            </form>

            <ol className="mt-5 space-y-4 border-l border-border pl-4">
              {activities.length === 0 ? (
                <li className="text-sm text-muted-foreground">Nothing logged yet.</li>
              ) : (
                activities.map((activity) => (
                  <li key={activity.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {activity.type} · {formatDate(activity.occurred_at)}
                    </p>
                    {activity.subject ? (
                      <p className="text-sm font-semibold text-navy">
                        {activity.subject}
                      </p>
                    ) : null}
                    {activity.body ? (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {activity.body}
                      </p>
                    ) : null}
                  </li>
                ))
              )}
            </ol>
          </section>
        </div>

        <aside className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-navy">Contact</h3>
          {contact ? (
            <dl className="mt-3 space-y-3 text-sm">
              <Row label="Name">
                {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—"}
              </Row>
              <Row label="Email">
                <a className="text-primary underline" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              </Row>
              <Row label="Phone">{contact.phone || "—"}</Row>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No contact linked.</p>
          )}
          <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
            Email the shopper from your own inbox. The CRM never sends mail —
            Resend owns receipts, Klaviyo owns marketing.
          </p>
        </aside>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-navy">{children}</dd>
    </div>
  );
}

function AmountField({
  value,
  disabled,
  onSave,
}: {
  value: number | null;
  disabled: boolean;
  onSave: (amount: number | null) => void;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  useEffect(() => {
    setDraft(value === null ? "" : String(value));
  }, [value]);

  return (
    <div className="space-y-2">
      <Label htmlFor="amount">Amount</Label>
      <Input
        id="amount"
        inputMode="decimal"
        disabled={disabled}
        value={draft}
        placeholder={formatMoney(value)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const trimmed = draft.trim();
          if (trimmed === "" && value === null) return;
          if (trimmed === "") {
            onSave(null);
            return;
          }
          const parsed = Number(trimmed);
          if (!Number.isFinite(parsed) || parsed < 0) {
            setDraft(value === null ? "" : String(value));
            return;
          }
          if (parsed !== value) onSave(parsed);
        }}
      />
    </div>
  );
}

function NextActionField({
  value,
  overdue,
  disabled,
  onSave,
}: {
  value: string | null;
  overdue: boolean;
  disabled: boolean;
  onSave: (next: string | null) => void;
}) {
  const asDate = value ? new Date(value).toISOString().slice(0, 10) : "";
  return (
    <div className="space-y-2">
      <Label htmlFor="next-action">
        Next action {overdue ? <span className="text-destructive">· overdue</span> : null}
      </Label>
      <Input
        id="next-action"
        type="date"
        disabled={disabled}
        value={asDate}
        onChange={(event) => {
          const raw = event.target.value;
          // Store noon UTC so the date a person picked survives every US
          // timezone rather than sliding a day back.
          onSave(raw ? new Date(`${raw}T12:00:00.000Z`).toISOString() : null);
        }}
      />
    </div>
  );
}

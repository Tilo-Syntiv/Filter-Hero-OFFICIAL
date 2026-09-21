import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPanel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-white p-5 shadow-sm", className)}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="text-sm font-bold text-navy">{title}</h2> : <span />}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "warn" | "danger" | "ok";
}) {
  const tones = {
    default: "border-border",
    warn: "border-amber-200 bg-amber-50/60",
    danger: "border-destructive/30 bg-destructive/5",
    ok: "border-emerald-200 bg-emerald-50/60",
  };
  return (
    <div className={cn("rounded-2xl border bg-white p-4 shadow-sm", tones[tone])}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function StatusDot({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          ok ? "bg-emerald-500" : "bg-amber-500",
        )}
      />
      <span className="text-navy">{label}</span>
      <span className="text-muted-foreground">{ok ? "On" : "Off"}</span>
    </span>
  );
}

export function AdminSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm"
    />
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export function AdminError({ children }: { children: ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}

export function AdminLoading() {
  return <p className="text-sm text-muted-foreground">Loading…</p>;
}

export function PersonName(parts: {
  first?: string | null;
  last?: string | null;
  email?: string | null;
}) {
  const name = [parts.first, parts.last].filter(Boolean).join(" ");
  return name || parts.email || "—";
}

export function MailLink({ email }: { email: string }) {
  return (
    <a className="text-primary underline-offset-2 hover:underline" href={`mailto:${email}`}>
      {email}
    </a>
  );
}

export function AdminTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full caption-bottom text-sm">
        <thead>
          <tr className="border-b text-left">
            {headers.map((header) => (
              <th
                key={header}
                className="h-10 px-2 font-medium whitespace-nowrap text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import TurnstileField, { readTurnstileToken, turnstileSiteKey } from "@/components/TurnstileField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  size: string;
  merv: 8 | 11 | 13;
  isCarbon?: boolean;
  label: string;
};

export default function BackInStockForm({ size, merv, isCarbon = false, label }: Props) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your email.");
      return;
    }
    const token = turnstileToken.trim() || readTurnstileToken();
    if (turnstileSiteKey() && !token) {
      toast.error("Complete the security check.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/stock-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          size,
          merv,
          isCarbon,
          website: honeypot,
          turnstileToken: token || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        toast.error(json.error || "Could not save that alert.");
        setTurnstileToken("");
        setTurnstileReset((n) => n + 1);
        return;
      }
      setDone(true);
      toast.success(`We'll email you when ${size} ${label} is back.`);
    } catch {
      toast.error("Could not save that alert.");
      setTurnstileReset((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-border bg-canvas/80 px-4 py-3 text-sm text-navy">
        You're on the list for {size} {label}. We'll email once when it's back —
        nothing else.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-canvas/80 p-4">
      <p className="text-sm font-semibold text-navy">
        {size} {label} is not available right now.
      </p>
      <p className="text-xs text-muted-foreground">
        Leave your email and we'll send one message when this rating is back in stock.
      </p>
      <label className="sr-only" htmlFor="fh-stock-alert-email">
        Email
      </label>
      <Input
        id="fh-stock-alert-email"
        type="email"
        autoComplete="email"
        required
        maxLength={200}
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-white"
      />
      {/* Honeypot — must be bound; hardcoded "" would never trip server-side */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
      />
      <TurnstileField
        action="stock-alert"
        resetSignal={turnstileReset}
        onToken={setTurnstileToken}
      />
      <Button type="submit" className="hero-shop-btn w-full text-white" disabled={busy}>
        {busy ? "Saving…" : "Email me when it's back"}
      </Button>
    </form>
  );
}

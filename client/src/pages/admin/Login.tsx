import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/admin-api";
import { markStaffAuthPending, staffMagicLinkRedirect } from "@/lib/staff-auth";

const fieldLabel =
  "text-xs font-bold uppercase tracking-wider text-muted-foreground";
const fieldInput = "h-12 rounded-xl border-border bg-white text-base";

/**
 * Magic-link sign in, with the 6-digit code as a second path.
 *
 * The link lands on /login (already on the Auth allowlist), then the matching
 * staff email is sent to /admin. The 6-digit code still works if the link
 * cannot. No passwords, so nothing to leak or rotate.
 *
 * The result message is identical whether or not the address is on
 * STAFF_EMAILS, so this form cannot be used to enumerate staff. A non-staff
 * address can complete the link and still gets 403 from every CRM route.
 */
export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "verifying" | "error">(
    "idle",
  );
  const [codeOpen, setCodeOpen] = useState(false);
  const [message, setMessage] = useState("");

  const sendLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = authClient();
    if (!supabase) return;
    setStatus("sending");
    const address = email.trim().toLowerCase();
    markStaffAuthPending(address);
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        // /admin is not on the production Auth allowlist. /login is.
        emailRedirectTo: staffMagicLinkRedirect(),
        shouldCreateUser: true,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage("Check your inbox for a sign-in link, or type the 6-digit code here.");
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = authClient();
    if (!supabase) return;
    setStatus("verifying");
    markStaffAuthPending(email.trim().toLowerCase());
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setStatus("sent");
      setMessage(error.message);
      return;
    }
    // onAuthStateChange in AdminShell takes it from here.
  };

  return (
    <div className="brand-band relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="page-hero-glow" aria-hidden />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_24px_50px_rgba(8,16,32,0.28)] sm:p-8">
        <p className="section-label">Staff console</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy md:text-3xl">
          Staff sign in
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          We&apos;ll email you a one-time link and a 6-digit code.
        </p>

        {status === "sent" || status === "verifying" || codeOpen ? (
          <form onSubmit={verifyCode} className="mt-8 space-y-5">
            <p className="rounded-2xl border border-ice/40 bg-secondary/70 p-4 text-sm font-semibold leading-relaxed text-navy">
              {message || "Type the 6-digit code from your inbox."}
            </p>
            <div className="space-y-2">
              <Label htmlFor="admin-email-code" className={fieldLabel}>
                Work email
              </Label>
              <Input
                id="admin-email-code"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldInput}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-code" className={fieldLabel}>
                6-digit code
              </Label>
              <Input
                id="admin-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={8}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\s+/g, ""))}
                placeholder="123456"
                className={`${fieldInput} tracking-[0.28em]`}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="hero-shop-btn w-full text-white"
              disabled={status === "verifying" || code.length < 6}
            >
              {status === "verifying" ? "Checking…" : "Sign in"}
              {status !== "verifying" ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
            <button
              type="button"
              className="section-link w-full justify-center !normal-case !tracking-normal"
              onClick={() => {
                setStatus("idle");
                setCodeOpen(false);
                setCode("");
                setMessage("");
              }}
            >
              Use a different email
            </button>
          </form>
        ) : (
          <form onSubmit={sendLink} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className={fieldLabel}>
                Work email
              </Label>
              <Input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@filterhero.net"
                className={fieldInput}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="hero-shop-btn w-full text-white"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Sending…" : "Send link"}
              {status !== "sending" ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
            <button
              type="button"
              className="section-link w-full justify-center !normal-case !tracking-normal"
              onClick={() => {
                if (!email.trim()) {
                  setStatus("error");
                  setMessage("Enter your work email first.");
                  return;
                }
                setCodeOpen(true);
                setMessage("Type the 6-digit code from your inbox.");
              }}
            >
              I already have a code
            </button>
            {status === "error" ? (
              <p className="text-xs font-semibold text-destructive">{message}</p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}

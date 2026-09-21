import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SiteHeader from "@/components/SiteHeader";
import CartDrawer from "@/components/CartDrawer";
import { useAccount } from "@/contexts/AccountContext";
import { authClient, isAdminConfigured } from "@/lib/admin-api";
import { safeNextPath } from "@/lib/account-api";
import { consumeStaffAuthPending } from "@/lib/staff-auth";
import { BRAND_NAME } from "@/const";
import { useSeo } from "@/hooks/useSeo";

const fieldLabel =
  "text-xs font-bold uppercase tracking-wider text-muted-foreground";
const fieldInput = "h-12 rounded-xl border-border bg-white text-base";
const MIN_PASSWORD = 8;

type View = "signin" | "signup" | "forgot" | "reset";

function authMessage(raw: string): string {
  const message = raw.toLowerCase();
  if (message.includes("invalid login")) {
    return "That email or password is not right.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirm your email first — check your inbox for the link.";
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return "That email already has an account. Sign in, or reset your password.";
  }
  if (message.includes("same password")) {
    return "Pick a new password that is different from the last one.";
  }
  return raw;
}

/**
 * Shopper email + password. The reset email is only for a forgotten password
 * or for someone who signed in with a link before passwords existed.
 * Staff stay on /admin/login.
 */
export default function CustomerLogin() {
  const [view, setView] = useState<View>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { session, ready, recovery, clearRecovery } = useAccount();
  const [, setLocation] = useLocation();
  const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));

  useSeo({
    title: `Sign in | ${BRAND_NAME}`,
    description: `Sign in to ${BRAND_NAME} with your email and password.`,
    path: "/login",
    noindex: true,
  });

  useEffect(() => {
    if (recovery) setView("reset");
  }, [recovery]);

  useEffect(() => {
    if (!ready || !session || recovery || view === "reset") return;
    if (consumeStaffAuthPending(session.user.email)) {
      setLocation("/admin");
      return;
    }
    setLocation(next);
  }, [ready, session, recovery, view, next, setLocation]);

  const redirectTo = `${window.location.origin}${next}`;
  const resetRedirect = `${window.location.origin}/login`;

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = authClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: fail } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (fail) {
      setError(authMessage(fail.message));
      return;
    }
    window.location.assign(next);
  };

  const signUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    const supabase = authClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    const { data, error: fail } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    if (fail) {
      setError(authMessage(fail.message));
      return;
    }
    if (data.session) {
      window.location.assign(next);
      return;
    }
    setMessage("Check your inbox to confirm the account, then sign in.");
  };

  const sendReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = authClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: fail } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: resetRedirect },
    );
    setBusy(false);
    if (fail) {
      setError(authMessage(fail.message));
      return;
    }
    setMessage("If that inbox has an account, we sent a link to set a new password.");
  };

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    const supabase = authClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: fail } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (fail) {
      setError(authMessage(fail.message));
      return;
    }
    clearRecovery();
    window.location.assign(next);
  };

  const switchView = (nextView: View) => {
    setView(nextView);
    setError("");
    setMessage("");
    setPassword("");
    setConfirm("");
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="brand-band relative flex flex-1 items-start justify-center overflow-hidden px-4 py-4 sm:items-center sm:py-8">
        <div className="page-hero-glow" aria-hidden />
        <div className="relative w-full max-w-md rounded-3xl bg-white p-5 shadow-[0_24px_50px_rgba(8,16,32,0.28)] sm:p-6">
          {!isAdminConfigured() ? (
            <p className="text-sm text-muted-foreground">
              Customer login is not configured on this server yet.
            </p>
          ) : view === "signup" ? (
            <AuthCard
              kicker="New account"
              heading="Create account"
              lede="At least 8 characters."
            >
              <form onSubmit={signUp} className="mt-4 space-y-3">
                <EmailField value={email} onChange={setEmail} />
                <PasswordField
                  id="customer-new-password"
                  label="Password"
                  autoComplete="new-password"
                  value={password}
                  onChange={setPassword}
                />
                <PasswordField
                  id="customer-confirm-password"
                  label="Confirm password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={setConfirm}
                />
                <Submit busy={busy} idle="Create account" wait="Creating…" />
                <FormNotes error={error} message={message} />
                <TextAction onClick={() => switchView("signin")}>
                  Already have an account? Sign in
                </TextAction>
              </form>
            </AuthCard>
          ) : view === "forgot" ? (
            <AuthCard
              kicker="Forgot password"
              heading="Reset password"
              lede="We’ll email a link to set a new one."
            >
              <form onSubmit={sendReset} className="mt-4 space-y-3">
                <EmailField value={email} onChange={setEmail} />
                <Submit busy={busy} idle="Send reset link" wait="Sending…" />
                <FormNotes error={error} message={message} />
                <TextAction onClick={() => switchView("signin")}>
                  Back to sign in
                </TextAction>
              </form>
            </AuthCard>
          ) : view === "reset" ? (
            <AuthCard
              kicker="New password"
              heading="Choose a password"
              lede="This is what you type at sign-in."
            >
              <form onSubmit={savePassword} className="mt-4 space-y-3">
                <PasswordField
                  id="customer-reset-password"
                  label="New password"
                  autoComplete="new-password"
                  value={password}
                  onChange={setPassword}
                />
                <PasswordField
                  id="customer-reset-confirm"
                  label="Confirm password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={setConfirm}
                />
                <Submit busy={busy} idle="Save password" wait="Saving…" />
                <FormNotes error={error} message={message} />
              </form>
            </AuthCard>
          ) : (
            <AuthCard
              kicker="Your account"
              heading="Sign in"
              lede="Email and password."
            >
              <form onSubmit={signIn} className="mt-4 space-y-3">
                <EmailField value={email} onChange={setEmail} />
                <PasswordField
                  id="customer-password"
                  label="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={setPassword}
                />
                <Submit busy={busy} idle="Sign in" wait="Signing in…" />
                <FormNotes error={error} message={message} />
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <TextAction onClick={() => switchView("forgot")}>
                    Forgot password?
                  </TextAction>
                  <TextAction onClick={() => switchView("signup")}>
                    Create an account
                  </TextAction>
                </div>
              </form>
            </AuthCard>
          )}
        </div>
      </main>
      <CartDrawer onRequestQuote={() => { window.location.href = "/#contact"; }} />
    </div>
  );
}

function AuthCard({
  kicker,
  heading,
  lede,
  children,
}: {
  kicker: string;
  heading: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <>
      <p className="section-label !mb-1">{kicker}</p>
      <h1 className="text-2xl font-bold tracking-tight text-navy">{heading}</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{lede}</p>
      {children}
    </>
  );
}

function EmailField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="customer-email" className={fieldLabel}>
        Email
      </Label>
      <Input
        id="customer-email"
        type="email"
        required
        autoComplete="email"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="you@email.com"
        className={fieldInput}
      />
    </div>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={fieldLabel}>
        {label}
      </Label>
      <Input
        id={id}
        type="password"
        required
        minLength={MIN_PASSWORD}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldInput}
      />
    </div>
  );
}

function Submit({
  busy,
  idle,
  wait,
}: {
  busy: boolean;
  idle: string;
  wait: string;
}) {
  return (
    <Button type="submit" size="lg" className="hero-shop-btn w-full text-white" disabled={busy}>
      {busy ? wait : idle}
      {!busy ? <ArrowRight className="h-4 w-4" /> : null}
    </Button>
  );
}

function FormNotes({ error, message }: { error: string; message: string }) {
  if (!error && !message) return null;
  return (
    <>
      {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
      {message ? (
        <p className="rounded-2xl border border-ice/40 bg-secondary/70 p-4 text-sm font-semibold leading-relaxed text-navy">
          {message}
        </p>
      ) : null}
    </>
  );
}

function TextAction({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="section-link !normal-case !tracking-normal"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

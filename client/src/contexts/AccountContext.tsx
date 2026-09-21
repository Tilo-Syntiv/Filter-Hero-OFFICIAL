import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { authClient, isAdminConfigured } from "@/lib/admin-api";

type AccountContextValue = {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  email: string | null;
  recovery: boolean;
  clearRecovery: () => void;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [ready, setReady] = useState(false);
  const configured = isAdminConfigured();

  useEffect(() => {
    const supabase = authClient();
    if (!supabase) {
      setReady(true);
      return;
    }
    const boot = (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code && !window.location.pathname.startsWith("/admin")) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.error("[account] code exchange", error.message);
        const next = params.get("next");
        const clean = window.location.pathname + (next ? `?next=${encodeURIComponent(next)}` : "");
        window.history.replaceState({}, "", clean);
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setReady(true);
    })();
    void boot;
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AccountContextValue>(
    () => ({
      ready,
      configured,
      session,
      email: session?.user.email?.toLowerCase() ?? null,
      recovery,
      clearRecovery: () => setRecovery(false),
    }),
    [ready, configured, session, recovery],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}

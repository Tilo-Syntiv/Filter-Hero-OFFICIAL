import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import type { Session } from "@supabase/supabase-js";
import { Menu } from "lucide-react";
import { authClient, isAdminConfigured } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import AdminLogin from "./Login";
import { ADMIN_NAV, isAdminNavActive } from "./nav";

/**
 * Wraps every /admin page: keeps the console out of search results, holds the
 * session, and renders the login screen instead of the page when signed out.
 *
 * The gate here is convenience, not security. The real check is `requireStaff`
 * on the server — a signed-in non-staff user sees this shell and then gets 403
 * from every request it makes.
 */
export default function AdminShell({
  title,
  children,
}: {
  title: string;
  children: (session: Session) => ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.title = `${title} · Staff · Filter Hero`;
    const meta =
      document.querySelector<HTMLMetaElement>('meta[name="robots"]') ??
      document.head.appendChild(
        Object.assign(document.createElement("meta"), { name: "robots" }),
      );
    const previous = meta.content;
    meta.content = "noindex, nofollow";
    return () => {
      meta.content = previous;
    };
  }, [title]);

  useEffect(() => {
    const supabase = authClient();
    if (!supabase) {
      setReady(true);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const boot = (async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.error("[admin] code exchange", error.message);
        window.history.replaceState({}, "", window.location.pathname);
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setReady(true);
    })();
    void boot;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isAdminConfigured()) {
    return (
      <BareFrame title={title}>
        <p className="text-sm text-muted-foreground">
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>,
          then restart the dev server.
        </p>
      </BareFrame>
    );
  }

  if (!ready) {
    return (
      <BareFrame title={title}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </BareFrame>
    );
  }

  if (!session) return <AdminLogin />;

  return (
    <ConsoleFrame title={title} email={session.user.email ?? ""}>
      {children(session)}
    </ConsoleFrame>
  );
}

function BareFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4">
          <Link
            href="/admin"
            className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary"
          >
            Filter Hero
          </Link>
          <h1 className="text-lg font-bold text-navy">{title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

function ConsoleFrame({
  title,
  email,
  children,
}: {
  title: string;
  email: string;
  children: ReactNode;
}) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f3f5f8]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-800 bg-slate-950 lg:flex">
        <NavBrand />
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <AdminNavList location={location} />
        </nav>
        <p className="border-t border-slate-800 px-4 py-3 text-[11px] leading-snug text-slate-400">
          CRM never emails shoppers. Resend owns receipts. Klaviyo owns marketing.
        </p>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open staff menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Staff console
                </p>
                <h1 className="text-lg font-bold text-navy">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void authClient()?.auth.signOut()}
              >
                Sign out
              </Button>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-72 border-slate-800 bg-slate-950 p-0 text-white [&>button]:text-white [&>button]:hover:bg-white/10"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Staff navigation</SheetTitle>
          </SheetHeader>
          <NavBrand />
          <nav className="px-3 py-4" onClick={() => setOpen(false)}>
            <AdminNavList location={location} />
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NavBrand() {
  return (
    <div className="border-b border-slate-800 px-4 py-4">
      <Link href="/admin" className="block">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-white">
          Filter Hero
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
          Staff console
        </p>
      </Link>
    </div>
  );
}

function AdminNavList({ location }: { location: string }) {
  return (
    <div className="space-y-5">
      {ADMIN_NAV.map((group) => (
        <div key={group.label}>
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isAdminNavActive(item.href, location);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition",
                      active
                        ? "bg-white/10 font-semibold text-white"
                        : "text-slate-300 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

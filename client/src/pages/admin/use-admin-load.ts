import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/admin-api";

/**
 * Loads staff API data. Search boxes debounce so a fast typer cannot burn
 * the admin rate limit (two list calls per keystroke on Contacts).
 * A later response never overwrites a newer query.
 */
export function useAdminLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  const hasData = useRef(false);
  const seq = useRef(0);

  const reload = useCallback(() => {
    const request = ++seq.current;
    if (!hasData.current) setPending(true);
    setError("");
    return loader()
      .then((next) => {
        if (request !== seq.current) return;
        hasData.current = true;
        setData(next);
      })
      .catch((err: unknown) => {
        if (request !== seq.current) return;
        if (err instanceof ApiError && err.code === "crm_disabled") {
          setError(
            "CRM is off. Add SUPABASE_SERVICE_ROLE_KEY and restart the server.",
          );
          return;
        }
        setError(err instanceof Error ? err.message : "Load failed.");
      })
      .finally(() => {
        if (request !== seq.current) return;
        setPending(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const delay = hasData.current ? 250 : 0;
    const timer = window.setTimeout(() => {
      void reload();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [reload]);

  return {
    data,
    error,
    loading: pending && !hasData.current,
    reload,
    setData,
  };
}

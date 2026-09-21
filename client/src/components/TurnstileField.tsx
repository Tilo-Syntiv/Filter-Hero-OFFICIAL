import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      action?: string;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "flexible" | "compact";
      appearance?: "always" | "execute" | "interaction-only";
      retry?: "auto" | "never";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "timeout-callback"?: () => void;
      "error-callback"?: (code?: string) => boolean | void;
    },
  ) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
  getResponse: (id?: string) => string;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Cloudflare Turnstile widget. Renders nothing when the site key is unset
 * so local smoke tests can still post to /api/contact.
 *
 * Mounts only when the host is near the viewport so the homepage footer
 * does not start a challenge (and Cloudflare's hidden console probe) on
 * every landing. Tokens are single-use — bump `resetSignal` after a send.
 */
export default function TurnstileField({
  onToken,
  resetSignal = 0,
  action = "contact",
}: {
  onToken: (token: string) => void;
  resetSignal?: number;
  action?: string;
}) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const host = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const callback = useRef(onToken);
  callback.current = onToken;
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "ready" | "ok" | "error">("idle");

  useEffect(() => {
    const el = host.current;
    if (!el || !siteKey) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey || !visible) return;
    let cancelled = false;
    let script: HTMLScriptElement | undefined;

    const clearToken = () => callback.current("");

    const mount = () => {
      if (cancelled || !host.current || !window.turnstile) return;
      if (widgetId.current) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = undefined;
      }
      host.current.replaceChildren();
      if (cancelled || !host.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(host.current, {
        sitekey: siteKey,
        action,
        theme: "light",
        size: "flexible",
        appearance: "always",
        retry: "auto",
        callback: (token) => {
          setStatus("ok");
          callback.current(token);
        },
        "expired-callback": () => {
          setStatus("ready");
          clearToken();
          if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
        },
        "timeout-callback": () => {
          setStatus("ready");
          clearToken();
          if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
        },
        "error-callback": () => {
          setStatus("error");
          clearToken();
          return true;
        },
      });
      if (widgetId.current) host.current.dataset.widgetId = widgetId.current;
      setStatus("ready");
    };

    const existing = document.querySelector<HTMLScriptElement>("script[data-fh-turnstile]");
    if (window.turnstile) {
      mount();
    } else if (existing) {
      script = existing;
      existing.addEventListener("load", mount);
    } else {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset.fhTurnstile = "1";
      script.addEventListener("load", mount);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      script?.removeEventListener("load", mount);
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = undefined;
      }
    };
  }, [siteKey, visible, action]);

  useEffect(() => {
    if (!resetSignal || !widgetId.current || !window.turnstile) return;
    setStatus("ready");
    callback.current("");
    window.turnstile.reset(widgetId.current);
  }, [resetSignal]);

  if (!siteKey) return null;
  return (
    <div className="space-y-2">
      <div
        ref={host}
        className="cf-turnstile min-h-[65px] w-full max-w-[19rem]"
        aria-label="Security check"
      />
      {status === "error" ? (
        <p className="text-xs text-destructive">
          Security check failed. Refresh the page or try again in a moment.
        </p>
      ) : null}
    </div>
  );
}

export function turnstileSiteKey(): string | undefined {
  const key = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  return key?.trim() || undefined;
}

export function readTurnstileToken(): string {
  const host = document.querySelector<HTMLElement>(".cf-turnstile");
  const widget = host?.dataset.widgetId;
  try {
    const fromApi = widget
      ? window.turnstile?.getResponse?.(widget)
      : window.turnstile?.getResponse?.();
    if (fromApi?.trim()) return fromApi.trim();
  } catch {
    /* widget not ready */
  }
  const input = document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]');
  return input?.value?.trim() || "";
}

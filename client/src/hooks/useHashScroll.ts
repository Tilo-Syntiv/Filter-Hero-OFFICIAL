import { useEffect } from "react";

function headerOffset() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--site-header-h",
  );
  const n = parseFloat(raw);
  return (Number.isFinite(n) ? n : 104) + 8;
}

function scrollTopFor(el: HTMLElement) {
  return Math.max(0, window.scrollY + el.getBoundingClientRect().top - headerOffset());
}

export function scrollToHashTarget(
  id: string,
  behavior: ScrollBehavior = "smooth",
) {
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;

  if (behavior === "auto") {
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo({ top: scrollTopFor(el), behavior: "auto" });
    html.style.scrollBehavior = previous;
  } else {
    window.scrollTo({ top: scrollTopFor(el), behavior: "smooth" });
  }
  return true;
}

/** Same-page header jumps. replaceState does not fire hashchange, so retry like a cold hash landing. */
export function jumpToHashTarget(id: string) {
  if (!id) return;
  scrollToHashTarget(id, "auto");
  if (window.location.hash !== `#${id}`) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
  }
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function nearHashTarget(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  const top = el.getBoundingClientRect().top;
  const offset = headerOffset();
  return top >= offset - 8 && top < offset + 96;
}

/** Scroll to a section after arriving with a hash like /#finder or #custom-quote. */
export function useHashScroll() {
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const clearTimers = () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.length = 0;
    };

    const schedule = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!id) return;
      clearTimers();
      const run = () => {
        if (cancelled) return;
        if (!nearHashTarget(id)) scrollToHashTarget(id, "auto");
      };
      run();
      for (const ms of [80, 200, 450, 800, 1400]) {
        timers.push(setTimeout(run, ms));
      }
    };

    schedule();
    window.addEventListener("hashchange", schedule);
    return () => {
      cancelled = true;
      clearTimers();
      window.removeEventListener("hashchange", schedule);
    };
  }, []);
}

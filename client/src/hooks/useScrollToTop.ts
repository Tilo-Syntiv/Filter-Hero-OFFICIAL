import { useLayoutEffect } from "react";
import { useLocation } from "wouter";

function scrollWindowToTop() {
  const html = document.documentElement;
  const previous = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  html.style.scrollBehavior = previous;
}

/** Reset scroll on client-side navigations. Wouter keeps the previous offset. */
export function useScrollToTop() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    if (window.location.hash) return;
    scrollWindowToTop();
  }, [location]);
}

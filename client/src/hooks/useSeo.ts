import { useEffect } from "react";
import {
  DEFAULT_SITE_URL,
  SITE_DEFAULTS,
  absoluteUrl,
} from "@shared/seo";

export function getSiteUrl(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    const { origin } = window.location;
    if (!origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return origin.replace(/\/$/, "");
    }
  }
  return DEFAULT_SITE_URL;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id: string, data: unknown | unknown[]) {
  const scriptId = `jsonld-${id}`;
  let el = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = scriptId;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
}

export type SeoProps = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "product" | "article";
  image?: string;
  noindex?: boolean;
  jsonLd?: unknown[];
};

/**
 * Client-side document head manager for SPA routes (SEO / AEO / social).
 */
export function useSeo({
  title,
  description,
  path,
  type = "website",
  image,
  noindex = false,
  jsonLd = [],
}: SeoProps) {
  const jsonLdKey = JSON.stringify(jsonLd);

  useEffect(() => {
    const siteUrl = getSiteUrl();
    const canonical = absoluteUrl(siteUrl, path);
    const ogImage = image
      ? image.startsWith("http")
        ? image
        : absoluteUrl(siteUrl, image)
      : absoluteUrl(siteUrl, "/logo.png");

    document.title = title;
    setMeta("name", "description", description);
    setMeta(
      "name",
      "robots",
      noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    );
    setMeta("name", "author", SITE_DEFAULTS.brand);
    setMeta(
      "name",
      "keywords",
      "HVAC air filters, furnace filters, MERV 8, MERV 11, MERV 13, custom air filter size, air filter finder",
    );

    setLink("canonical", canonical);

    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta(
      "property",
      "og:type",
      type === "product" ? "product" : type === "article" ? "article" : "website",
    );
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:site_name", SITE_DEFAULTS.brand);
    setMeta("property", "og:locale", SITE_DEFAULTS.locale);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:image:alt", `${SITE_DEFAULTS.brand} — ${title}`);

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);
    setMeta("name", "twitter:image:alt", `${SITE_DEFAULTS.brand} — ${title}`);

    setLink("alternate", absoluteUrl(siteUrl, "/llms.txt"));

    const parsed = JSON.parse(jsonLdKey) as unknown[];
    document.getElementById("jsonld-ssr")?.remove();
    if (parsed.length > 0) {
      setJsonLd("page", parsed.length === 1 ? parsed[0] : parsed);
    } else {
      document.getElementById("jsonld-page")?.remove();
    }
  }, [title, description, path, type, image, noindex, jsonLdKey]);
}

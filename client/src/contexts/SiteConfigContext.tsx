import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_SITE_CONFIG,
  featuredSizesFromConfig,
  toPublicSiteConfig,
  type PublicSiteConfig,
  type SiteFaqItem,
} from "@shared/site-config";
import { SITE_FAQS } from "@shared/seo";

type SiteConfigValue = PublicSiteConfig & {
  ready: boolean;
  faqsForStore: SiteFaqItem[];
  featuredSizes: string[];
};

const defaults = toPublicSiteConfig(DEFAULT_SITE_CONFIG);

const SiteConfigContext = createContext<SiteConfigValue>({
  ...defaults,
  ready: false,
  faqsForStore: SITE_FAQS,
  featuredSizes: featuredSizesFromConfig([]),
});

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicSiteConfig>(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const res = await fetch("/api/site-config");
          if (!res.ok) throw new Error(String(res.status));
          const payload = (await res.json()) as { ok?: boolean; data?: PublicSiteConfig };
          if (cancelled) return;
          if (payload?.data) setConfig({ ...defaults, ...payload.data });
          break;
        } catch {
          if (attempt === 5) break;
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        }
      }
      if (!cancelled) setReady(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<SiteConfigValue>(
    () => ({
      ...config,
      ready,
      faqsForStore: config.faqs.length ? config.faqs : SITE_FAQS,
      featuredSizes: featuredSizesFromConfig(config.featuredSizeSlugs),
    }),
    [config, ready],
  );

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}

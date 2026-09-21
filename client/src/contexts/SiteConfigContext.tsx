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
    void fetch("/api/site-config")
      .then((res) => res.json())
      .then((payload: { ok?: boolean; data?: PublicSiteConfig }) => {
        if (cancelled || !payload?.data) return;
        setConfig({ ...defaults, ...payload.data });
      })
      .catch(() => {
        /* keep defaults — the shop still renders */
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
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

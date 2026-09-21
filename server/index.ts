import "dotenv/config";
import express from "express";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { ALL_FILTER_SIZES, FILTER_SIZES, MERV_TYPES, SELLABLE_ONLY, THICKNESSES } from "../shared/products";
import {
  DEFAULT_SITE_URL,
  absoluteUrl,
  buildAiTxt,
  buildLlmsFullTxt,
  buildLlmsTxt,
  injectSeoIntoHtml,
  resolveDocumentSeo,
  sitemapPaths,
} from "../shared/seo";
import { submitContact } from "./contact";
import { accountRouter } from "./account-routes";
import { requireStaff } from "./auth";
import { crmRouter } from "./crm/routes";
import { accountHealth, crmHealth, logCrmBoot } from "./db";
import {
  applySecurityHeaders,
  checkoutLimiter,
  contactLimiter,
  identifyLimiter,
  jsonBodyError,
  publicError,
  sanitizeEventProperties,
  sanitizeIdentifyProperties,
  trackLimiter,
  unexpectedError,
} from "./security";
import {
  buildKlaviyoCatalog,
  isClientMetric,
  klaviyoHealth,
  klaviyoPublicConfig,
  trackKlaviyoEvent,
  upsertKlaviyoProfile,
} from "./klaviyo";
import { createCheckoutSession, getCheckoutSessionStatus, handleStripeWebhook } from "./stripe";
import { adminRouter } from "./admin/routes";
import { isCheckoutPaused, publicSiteConfig } from "./admin/config";
import { intuitRouter } from "./intuit/routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const checkoutBodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(50),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  marketingConsent: z.boolean().optional(),
});

const identifyBodySchema = z.object({
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  anonymousId: z.string().trim().max(80).optional(),
  properties: z.unknown().optional(),
});

const trackBodySchema = z.object({
  metric: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  anonymousId: z.string().trim().max(80).optional(),
  properties: z.unknown().optional(),
  value: z.number().optional(),
});

async function startServer() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(applySecurityHeaders);
  const server = createServer(app);
  const isProd = process.env.NODE_ENV === "production";
  const siteUrl = (
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL ||
    (isProd ? DEFAULT_SITE_URL : undefined) ||
    DEFAULT_SITE_URL
  ).replace(/\/$/, "");
  const clientUrl = (
    process.env.CLIENT_URL ||
    (isProd ? siteUrl : "http://localhost:3000")
  ).replace(/\/$/, "");

  // Stripe webhook needs raw body — register before json parser
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const result = await handleStripeWebhook(
          req.body as Buffer,
          req.headers["stripe-signature"] as string | undefined,
        );
        res.json(result);
      } catch (err) {
        const { status, body } = publicError(
          err,
          { code: "webhook_failed", message: "Webhook rejected." },
          "[stripe webhook]",
        );
        res.status(status).json(body);
      }
    },
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(jsonBodyError);

  app.get("/sitemap.xml", (_req, res) => {
    const lastmod = new Date().toISOString().slice(0, 10);
    const urls = sitemapPaths()
      .map(
        ({ path: p, changefreq, priority }) => `  <url>
    <loc>${absoluteUrl(siteUrl, p)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
      )
      .join("\n");
    res
      .type("application/xml")
      .send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);
  });

  app.get("/robots.txt", (_req, res) => {
    res
      .type("text/plain")
      .send(`User-agent: *
Allow: /
Disallow: /checkout/
Disallow: /admin
Disallow: /login
Disallow: /account
Disallow: /api/

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Bytespider
Allow: /

User-agent: CCBot
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: Google-CloudVertexBot
Allow: /

User-agent: meta-externalagent
Allow: /

Sitemap: ${absoluteUrl(siteUrl, "/sitemap.xml")}
`);
  });

  app.get("/llms.txt", (_req, res) => {
    res.type("text/plain").send(buildLlmsTxt(siteUrl));
  });

  app.get("/llms-full.txt", (_req, res) => {
    res.type("text/plain").send(buildLlmsFullTxt(siteUrl));
  });

  app.get("/ai.txt", (_req, res) => {
    res.type("text/plain").send(buildAiTxt(siteUrl));
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, brand: "Filter Hero" });
  });

  app.get("/api/health/detail", requireStaff, async (_req, res) => {
    res.json({
      ok: true,
      brand: "Filter Hero",
      crm: await crmHealth(),
      account: await accountHealth(),
      klaviyo: await klaviyoHealth(),
    });
  });

  app.get("/api/site-config", (_req, res) => {
    res.json({ ok: true, data: publicSiteConfig() });
  });

  app.get("/api/products", (_req, res) => {
    res.json({
      sizeCount: FILTER_SIZES.length,
      archivedSizeCount: ALL_FILTER_SIZES.length,
      sellableOnly: SELLABLE_ONLY,
      thicknesses: THICKNESSES,
      merv: MERV_TYPES.map((t) => t.key),
    });
  });

  app.get("/api/checkout/session", async (req, res) => {
    try {
      const sessionId =
        typeof req.query.session_id === "string" ? req.query.session_id : "";
      const result = await getCheckoutSessionStatus(sessionId);
      res.json(result);
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "session_lookup_failed", message: "Could not load that checkout session." },
      );
      if (status !== 400) console.error("[checkout session]", err);
      res.status(status).json({ ...body, paid: false });
    }
  });

  app.post("/api/checkout", checkoutLimiter, async (req, res) => {
    try {
      if (isCheckoutPaused()) {
        res.status(503).json({
          error: publicSiteConfig().maintenanceMessage || "Checkout is paused for maintenance.",
          code: "maintenance",
        });
        return;
      }
      const { items, email, marketingConsent } = checkoutBodySchema.parse(req.body);
      const session = await createCheckoutSession(items, clientUrl, {
        email: email || undefined,
        marketingConsent,
      });
      if (!session.url) {
        res.status(500).json({ error: "No checkout URL returned" });
        return;
      }
      res.json({ url: session.url });
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "checkout_failed", message: "Checkout could not start." },
        "[checkout]",
      );
      res.status(status).json(body);
    }
  });

  app.post("/api/contact", contactLimiter, async (req, res) => {
    try {
      const result = await submitContact(req.body);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message === "Could not verify that form.") {
        res.status(400).json({ error: err.message, code: "bot_check_failed" });
        return;
      }
      const { status, body } = publicError(
        err,
        { code: "contact_failed", message: "Contact failed" },
        "[contact]",
      );
      res.status(status).json(body);
    }
  });

  app.get("/api/klaviyo/config", (_req, res) => {
    res.json(klaviyoPublicConfig());
  });

  app.get("/api/klaviyo/health", requireStaff, async (_req, res) => {
    res.json(await klaviyoHealth());
  });

  app.get("/api/klaviyo/catalog.json", (_req, res) => {
    res.json(buildKlaviyoCatalog(siteUrl));
  });

  app.post("/api/identify", identifyLimiter, async (req, res) => {
    try {
      const body = identifyBodySchema.parse(req.body);
      const result = await upsertKlaviyoProfile({
        ...body,
        properties: sanitizeIdentifyProperties(body.properties),
      });
      res.json({ ok: result.ok, error: result.error });
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "identify_failed", message: "Could not save that." },
        "[identify]",
      );
      res.status(status).json(body);
    }
  });

  app.post("/api/track", trackLimiter, async (req, res) => {
    try {
      const body = trackBodySchema.parse(req.body);
      if (!isClientMetric(body.metric)) {
        res.status(400).json({ error: "Unknown metric", code: "unknown_metric" });
        return;
      }
      const result = await trackKlaviyoEvent({
        metric: body.metric,
        email: body.email,
        phone: body.phone,
        firstName: body.firstName,
        lastName: body.lastName,
        anonymousId: body.anonymousId,
        properties: sanitizeEventProperties(body.properties),
        value: body.value,
      });
      res.json({ ok: result.ok, error: result.error });
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "track_failed", message: "Could not record that." },
        "[track]",
      );
      res.status(status).json(body);
    }
  });

  app.use("/api/crm", crmRouter());
  app.use("/api/account", accountRouter());
  app.use("/api/admin", adminRouter());
  app.use("/api/intuit", intuitRouter());

  const sendDocument = (req: express.Request, res: express.Response, indexPath: string) => {
    const html = fs.readFileSync(indexPath, "utf8");
    const seo = resolveDocumentSeo(req.path, siteUrl);
    res.type("html").send(injectSeoIntoHtml(html, seo));
  };

  if (isProd) {
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath, { index: false }));
    app.get("*", (req, res) => {
      sendDocument(req, res, path.join(staticPath, "index.html"));
    });
  } else {
    const indexPath = path.resolve(__dirname, "../client/index.html");
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      if (!fs.existsSync(indexPath)) return next();
      sendDocument(req, res, indexPath);
    });
  }

  app.use(unexpectedError);

  const port = Number(process.env.PORT) || (isProd ? 3000 : 3001);
  let retries = 0;

  const listen = () => {
    server.listen(port, () => {
      console.log(`API server running on http://localhost:${port}/`);
      logCrmBoot();
    });
  };

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && retries < 8) {
      retries += 1;
      console.warn(`[server] port ${port} in use, retry ${retries}/8`);
      setTimeout(listen, 400);
      return;
    }
    console.error(err);
    process.exit(1);
  });

  listen();
}

startServer().catch(console.error);

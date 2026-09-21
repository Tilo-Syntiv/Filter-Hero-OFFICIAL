import { Router, type Response } from "express";
import { z } from "zod";
import { requireStaff } from "../auth";
import { accountHealth, crmHealth } from "../db";
import { klaviyoHealth } from "../klaviyo";
import { ensureKlaviyoStripeWebhook, klaviyoStripeStatus } from "../klaviyo-stripe";
import { getStripe } from "../stripe";
import { readStripeTaxReadiness } from "../../shared/stripe-tax";
import { adminLimiter, publicError } from "../security";
import { loadSiteConfig, saveSiteConfig } from "./config";
import { intuitOAuth } from "../intuit/oauth";
import {
  analyticsSnapshot,
  buildOverview,
  catalogSnapshot,
  getAdminCustomer,
  getAdminOrder,
  listAdminAudit,
  listAdminContacts,
  listAdminCustomers,
  listAdminLeads,
  listAdminOrders,
  maintenanceSnapshot,
  securitySnapshot,
  settingsSnapshot,
  staffSnapshot,
  trackingSnapshot,
} from "./data";

/**
 * Staff console API. Every route sits behind requireStaff.
 *
 * This module reads orders.json, leads.json, site-config.json, and Postgres.
 * It does not send email and does not write Klaviyo — Resend and Klaviyo stay
 * in their own files. See shared/email-channels.ts.
 */

const querySchema = z.object({
  q: z.string().trim().max(80).optional(),
  intent: z.enum(["quote", "support", "reminder"]).optional(),
  limit: z.coerce.number().int().min(1).max(400).optional(),
});

function sendData<T>(res: Response, data: T): void {
  res.json({ ok: true, data });
}

export function adminRouter(): Router {
  const router = Router();
  router.use(adminLimiter, requireStaff);

  router.get("/overview", async (_req, res) => {
    try {
      sendData(res, await buildOverview());
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "overview_failed", message: "Could not load the overview." },
        "[admin] overview",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.get("/orders", (req, res) => {
    try {
      const query = querySchema.parse(req.query);
      sendData(res, listAdminOrders(query));
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "invalid_query", message: "Invalid filter." },
        "[admin] orders",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.get("/orders/:id", (req, res) => {
    const order = getAdminOrder(req.params.id);
    if (!order) {
      res.status(404).json({ ok: false, error: "Order not found.", code: "not_found" });
      return;
    }
    sendData(res, order);
  });

  router.get("/leads", (req, res) => {
    try {
      const query = querySchema.parse(req.query);
      sendData(res, listAdminLeads(query));
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "invalid_query", message: "Invalid filter." },
        "[admin] leads",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.get("/customers", async (req, res) => {
    try {
      const query = querySchema.parse(req.query);
      sendData(res, await listAdminCustomers(query));
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "customers_failed", message: "Could not load customers." },
        "[admin] customers",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.get("/customers/:id", async (req, res) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const customer = await getAdminCustomer(id);
      if (!customer) {
        res.status(404).json({ ok: false, error: "Customer not found.", code: "not_found" });
        return;
      }
      sendData(res, customer);
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "customer_failed", message: "Could not load that customer." },
        "[admin] customer",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.get("/contacts", async (req, res) => {
    try {
      const query = querySchema.parse(req.query);
      sendData(res, await listAdminContacts(query));
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "contacts_failed", message: "Could not load contacts." },
        "[admin] contacts",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.get("/audit", async (_req, res) => {
    try {
      sendData(res, await listAdminAudit());
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "audit_failed", message: "Could not load the audit log." },
        "[admin] audit",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.get("/catalog", (req, res) => {
    try {
      const query = querySchema.parse(req.query);
      sendData(res, catalogSnapshot(query));
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "catalog_failed", message: "Could not load the catalog." },
        "[admin] catalog",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.get("/analytics", (_req, res) => {
    sendData(res, analyticsSnapshot());
  });

  router.get("/tracking", (_req, res) => {
    sendData(res, trackingSnapshot());
  });

  router.get("/health", async (_req, res) => {
    try {
      const [crm, account, klaviyo] = await Promise.all([
        crmHealth(),
        accountHealth(),
        klaviyoHealth().catch((err) => {
          console.error("[admin] klaviyo health", err);
          return {
            enabled: false,
            publicKey: Boolean(process.env.KLAVIYO_PUBLIC_API_KEY?.trim()),
            listConfigured: Boolean(process.env.KLAVIYO_LIST_ID?.trim()),
            error: "unavailable",
          };
        }),
      ]);
      sendData(res, {
        crm,
        account,
        klaviyo,
        stripe: { configured: Boolean(getStripe()) },
        resend: { configured: Boolean(process.env.RESEND_API_KEY?.trim()) },
      });
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "health_failed", message: "Could not load health." },
        "[admin] health",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.get("/security", async (_req, res) => {
    try {
      const audit = await listAdminAudit(40);
      sendData(res, { ...securitySnapshot(), audit });
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "security_failed", message: "Could not load security." },
        "[admin] security",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.get("/staff", (_req, res) => {
    sendData(res, staffSnapshot());
  });

  router.get("/settings", async (_req, res) => {
    try {
      sendData(res, {
        ...settingsSnapshot(),
        klaviyoStripe: await klaviyoStripeStatus(),
        stripeTax: await readStripeTaxReadiness(getStripe()),
      });
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "settings_failed", message: "Could not load settings." },
        "[admin] settings",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.post("/klaviyo-stripe/connect", async (_req, res) => {
    try {
      sendData(res, await ensureKlaviyoStripeWebhook());
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "klaviyo_stripe_connect_failed", message: "Could not connect Klaviyo to Stripe." },
        "[admin] klaviyo-stripe",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.get("/intuit/status", (_req, res) => {
    sendData(res, intuitOAuth.status());
  });

  router.post("/intuit/connect", (req, res) => {
    let started;
    try {
      started = intuitOAuth.startConnect(req.staff?.email);
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "intuit_connect_failed", message: "Could not start QuickBooks connect." },
        "[intuit] connect",
      );
      res.status(status).json({ ok: false, ...body });
      return;
    }
    if (!started.ok) {
      res.status(started.status).json({
        ok: false,
        error: started.message,
        code: started.kind,
      });
      return;
    }
    const production = process.env.NODE_ENV === "production";
    res.setHeader(
      "Set-Cookie",
      [
        `fh_intuit_oauth_state=${encodeURIComponent(started.data.state)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=600",
        production ? "Secure" : "",
      ]
        .filter(Boolean)
        .join("; "),
    );
    sendData(res, { url: started.data.url });
  });

  router.post("/intuit/disconnect", async (_req, res) => {
    try {
      await intuitOAuth.disconnect();
      sendData(res, { connected: false });
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "intuit_disconnect_failed", message: "Could not disconnect QuickBooks." },
        "[intuit] disconnect",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.get("/maintenance", (_req, res) => {
    sendData(res, maintenanceSnapshot());
  });

  router.get("/config", (_req, res) => {
    sendData(res, loadSiteConfig());
  });

  router.patch("/config", (req, res) => {
    try {
      const email = req.staff?.email ?? "unknown@filterhero";
      sendData(res, saveSiteConfig(req.body, email));
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "config_failed", message: "Could not save that configuration." },
        "[admin] config",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  return router;
}

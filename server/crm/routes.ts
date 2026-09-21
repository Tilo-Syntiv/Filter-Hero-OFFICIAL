import { Router, type Response } from "express";
import { z } from "zod";
import { requireStaff, type StaffActor } from "../auth";
import { crmHealth, isCrmEnabled } from "../db";
import { crmLimiter, publicError } from "../security";
import { completeTask, listActivitiesForDeal, logActivity } from "./activities";
import { getContact, upsertContact } from "./contacts";
import { createDeal, getDeal, listDeals, listStages, updateDeal } from "./deals";
import {
  activityInputSchema,
  contactInputSchema,
  dealInputSchema,
  dealListQuerySchema,
  dealUpdateSchema,
  type CrmActor,
  type CrmResult,
} from "./schema";

/**
 * Staff-only CRM API. Every route sits behind `requireStaff`, and every
 * mutation carries the signed-in staff member into the audit log.
 *
 * Nothing here sends email. Resend owns transactional, Klaviyo owns marketing,
 * and a third sender would re-open FH-171. See docs/CRM.md.
 */

function actorFrom(staff: StaffActor | undefined): CrmActor {
  return { id: staff?.id ?? null, email: staff?.email ?? "unknown@filterhero" };
}

/**
 * Map a CrmResult onto a response. A disabled CRM is 503, a missing row is 404,
 * and anything else is a database failure the caller cannot act on — log the
 * detail, return a fixed string (FH-175).
 */
function sendJson<T>(res: Response, result: CrmResult<T>): void {
  if (result.ok) {
    res.json({ ok: true, data: result.data });
    return;
  }
  const status =
    result.code === "crm_disabled" ? 503 : result.code === "not_found" ? 404 : 502;
  if (status === 502) console.error("[crm]", result.code, result.error);
  res.status(status).json({
    ok: false,
    error: status === 502 ? "The CRM could not complete that." : result.error,
    code: result.code ?? "crm_error",
  });
}

export function crmRouter(): Router {
  const router = Router();

  router.use(crmLimiter, requireStaff);

  router.get("/health", async (_req, res) => {
    res.json(await crmHealth());
  });

  router.get("/stages", async (_req, res) => {
    sendJson(res, await listStages());
  });

  router.get("/deals", async (req, res) => {
    try {
      const query = dealListQuerySchema.parse(req.query);
      sendJson(res, await listDeals(query));
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "invalid_query", message: "Invalid filter." },
        "[crm] deals list",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.post("/deals", async (req, res) => {
    try {
      const input = dealInputSchema.parse(req.body);
      const result = await createDeal(input, actorFrom(req.staff));
      sendJson(res, result.ok ? { ok: true, data: result.data.deal } : result);
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "invalid_deal", message: "Could not create that deal." },
        "[crm] deal create",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.get("/deals/:id", async (req, res) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) {
      res.status(400).json({ ok: false, error: "Invalid id.", code: "invalid_id" });
      return;
    }
    const deal = await getDeal(id.data);
    if (!deal.ok) {
      sendJson(res, deal);
      return;
    }
    if (!deal.data) {
      res.status(404).json({ ok: false, error: "Deal not found.", code: "not_found" });
      return;
    }
    const [activities, contact] = await Promise.all([
      listActivitiesForDeal(deal.data.id),
      deal.data.contact_id ? getContact(deal.data.contact_id) : Promise.resolve(null),
    ]);
    res.json({
      ok: true,
      data: {
        deal: deal.data,
        contact: contact && contact.ok ? contact.data : null,
        activities: activities.ok ? activities.data : [],
      },
    });
  });

  router.patch("/deals/:id", async (req, res) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const patch = dealUpdateSchema.parse(req.body);
      sendJson(res, await updateDeal(id, patch, actorFrom(req.staff)));
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "invalid_update", message: "Could not update that deal." },
        "[crm] deal update",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.post("/activities", async (req, res) => {
    try {
      const input = activityInputSchema.parse(req.body);
      sendJson(res, await logActivity(input, actorFrom(req.staff)));
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "invalid_activity", message: "Could not save that note." },
        "[crm] activity create",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.post("/activities/:id/complete", async (req, res) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) {
      res.status(400).json({ ok: false, error: "Invalid id.", code: "invalid_id" });
      return;
    }
    sendJson(res, await completeTask(id.data, actorFrom(req.staff)));
  });

  router.post("/contacts", async (req, res) => {
    try {
      const input = contactInputSchema.parse(req.body);
      sendJson(res, await upsertContact(input, actorFrom(req.staff)));
    } catch (err) {
      const { status, body } = publicError(
        err,
        { code: "invalid_contact", message: "Could not save that contact." },
        "[crm] contact upsert",
      );
      res.status(status).json({ ok: false, ...body });
    }
  });

  return router;
}

export { isCrmEnabled };

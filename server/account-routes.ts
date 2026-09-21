import { Router, type Response } from "express";
import { ZodError } from "zod";
import { requireCustomer, type CustomerActor } from "./auth";
import { accountHealth } from "./db";
import { accountLimiter } from "./security";
import {
  getAccount,
  profileUpdateSchema,
  removeFilter,
  saveFilter,
  saveFilterSchema,
  updateProfile,
  type AccountResult,
} from "./account";

/**
 * Shopper-facing account API. Every route sits behind `requireCustomer`.
 * The session email is the only identity used to load orders — a request
 * body cannot ask for someone else's history.
 */

function sendJson<T>(res: Response, result: AccountResult<T>): void {
  if (result.ok) {
    res.json({ ok: true, data: result.data });
    return;
  }
  const status =
    result.code === "account_disabled"
      ? 503
      : result.code === "not_found" || result.code === "unknown_product"
        ? 404
        : 502;
  if (status === 502) console.error("[account]", result.code, result.error);
  res.status(status).json({
    ok: false,
    error:
      status === 502 ? "Your account could not complete that." : result.error,
    code: result.code,
  });
}

function actor(req: { customer?: CustomerActor }): CustomerActor {
  return req.customer!;
}

function invalidRequest(err: unknown, log: string) {
  if (err instanceof ZodError) {
    return { status: 400, body: { error: "Some fields are missing or invalid.", code: "invalid_request" } };
  }
  console.error(log, err);
  return { status: 400, body: { error: "Some fields are missing or invalid.", code: "invalid_request" } };
}

export function accountRouter(): Router {
  const router = Router();

  router.use(accountLimiter, requireCustomer);

  router.get("/health", async (_req, res) => {
    res.json(await accountHealth());
  });

  router.get("/", async (req, res) => {
    sendJson(res, await getAccount(actor(req)));
  });

  router.patch("/", async (req, res) => {
    try {
      const input = profileUpdateSchema.parse(req.body);
      sendJson(res, await updateProfile(actor(req), input));
    } catch (err) {
      const { status, body } = invalidRequest(err, "[account] profile");
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.post("/filters", async (req, res) => {
    try {
      const input = saveFilterSchema.parse(req.body);
      sendJson(res, await saveFilter(actor(req), input));
    } catch (err) {
      const { status, body } = invalidRequest(err, "[account] save filter");
      res.status(status).json({ ok: false, ...body });
    }
  });

  router.delete("/filters/:id", async (req, res) => {
    sendJson(res, await removeFilter(actor(req), req.params.id));
  });

  return router;
}

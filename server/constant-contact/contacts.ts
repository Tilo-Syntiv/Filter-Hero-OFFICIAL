import { CC_API_BASE } from "../../shared/constant-contact-oauth";
import { constantContactOAuth } from "./oauth";

type TokenResult = { ok: true; data: { accessToken: string } } | { ok: false; message?: string };

type Deps = {
  accessToken?: () => Promise<TokenResult>;
  fetch?: typeof fetch;
};

/** Account ping only. Does not create lists, write contacts, or subscribe anyone. */
export async function constantContactLiveCheck(deps: Deps = {}): Promise<{
  ok: boolean;
  organizationName: string | null;
  contactEmail: string | null;
}> {
  const accessToken = deps.accessToken ?? (() => constantContactOAuth.accessToken());
  const doFetch = deps.fetch ?? fetch;
  const token = await accessToken();
  if (!token.ok) {
    return { ok: false, organizationName: null, contactEmail: null };
  }
  const accountRes = await doFetch(`${CC_API_BASE}/account/summary`, {
    headers: { Authorization: `Bearer ${token.data.accessToken}`, Accept: "application/json" },
  });
  const account = accountRes.ok
    ? ((await accountRes.json().catch(() => ({}))) as {
        organization_name?: string;
        contact_email?: string;
      })
    : {};
  return {
    ok: accountRes.ok,
    organizationName: account.organization_name?.trim() || null,
    contactEmail: account.contact_email?.trim() || null,
  };
}

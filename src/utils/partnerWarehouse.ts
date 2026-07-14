/**
 * Value for APIs like GET partner/deliveryagents/getall?warehouseId=
 * Prefer explicit warehouse fields from login; otherwise use partner `user.id` (your API scopes by partner user).
 */

const STORAGE_KEY = "partnerWarehouseId";

function asId(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

/**
 * Read warehouse id from a user object (shape varies by backend).
 */
export function extractWarehouseIdFromUser(user: unknown): string | undefined {
  if (!user || typeof user !== "object") return undefined;
  const u = user as Record<string, unknown>;

  const direct =
    asId(u.warehouseId) ||
    asId(u.warehouse_id) ||
    asId(u.partnerWarehouseId) ||
    asId(u.partner_warehouse_id) ||
    asId(u.defaultWarehouseId) ||
    asId(u.default_warehouse_id);
  if (direct) return direct;

  const wh = u.warehouse;
  if (wh && typeof wh === "object") {
    const w = wh as Record<string, unknown>;
    const nested =
      asId(w.id) || asId(w.warehouseId) || asId(w.warehouse_id);
    if (nested) return nested;
  }

  const store = u.store;
  if (store && typeof store === "object") {
    const s = store as Record<string, unknown>;
    const sid =
      asId(s.warehouseId) ||
      asId(s.warehouse_id) ||
      (s.warehouse && typeof s.warehouse === "object"
        ? asId((s.warehouse as Record<string, unknown>).id)
        : undefined);
    if (sid) return sid;
  }

  const supplier = u.supplier;
  if (supplier && typeof supplier === "object") {
    const sup = supplier as Record<string, unknown>;
    const sid =
      asId(sup.warehouseId) ||
      asId(sup.warehouse_id) ||
      (sup.warehouse && typeof sup.warehouse === "object"
        ? asId((sup.warehouse as Record<string, unknown>).id)
        : undefined);
    if (sid) return sid;
  }

  const partner = u.partner;
  if (partner && typeof partner === "object") {
    const p = partner as Record<string, unknown>;
    const pid = asId(p.warehouseId) || asId(p.warehouse_id);
    if (pid) return pid;
    const pw = p.warehouse;
    if (pw && typeof pw === "object")
      return asId((pw as Record<string, unknown>).id);
  }

  // Partner auth often returns only user.id — backend uses it as warehouseId for scoped lists
  return asId(u.id);
}

/**
 * Login `data` object: `{ user, accessToken, ... }` — warehouse id may sit next to `user` or inside it.
 */
export function extractWarehouseIdFromLoginData(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;

  const fromRoot =
    asId(d.warehouseId) ||
    asId(d.warehouse_id) ||
    asId(d.partnerWarehouseId) ||
    asId(d.defaultWarehouseId);
  if (fromRoot) return fromRoot;

  const fromUser = extractWarehouseIdFromUser(d.user);
  if (fromUser) return fromUser;

  const nested = d.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return extractWarehouseIdFromLoginData(nested);
  }

  return undefined;
}

/**
 * Call after successful login. Only writes when the response includes an id — does not clear
 * existing `warehouseId` (e.g. create-password flow may omit it on a later call).
 */
export function persistWarehouseIdAfterLogin(loginData: unknown): void {
  const id = extractWarehouseIdFromLoginData(loginData);
  if (id) {
    localStorage.setItem(STORAGE_KEY, id);
  }
}

/**
 * Resolve warehouse id: dedicated key first (set at login), then parse `user` JSON and cache.
 */
export function getPartnerWarehouseId(): string | undefined {
  try {
    const direct = localStorage.getItem(STORAGE_KEY);
    if (direct?.trim()) return direct.trim();

    const rawUser = localStorage.getItem("partnerUser");
    if (rawUser) {
      const u = JSON.parse(rawUser) as unknown;
      const fromUser = extractWarehouseIdFromUser(u);
      if (fromUser) {
        localStorage.setItem(STORAGE_KEY, fromUser);
        return fromUser;
      }
    }
  } catch {
    /* ignore */
  }

  return undefined;
}

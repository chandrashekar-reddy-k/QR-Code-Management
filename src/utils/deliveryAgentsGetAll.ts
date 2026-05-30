/**
 * Normalize GET partner/deliveryagents/getall (and similar) JSON to an array of records.
 */
export function extractAgentsFromGetAllResponse(raw: unknown): Record<string, unknown>[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];

  if (typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;

  const tryArray = (v: unknown): Record<string, unknown>[] | null =>
    Array.isArray(v) ? (v as Record<string, unknown>[]) : null;

  const direct =
    tryArray(root.data) ||
    tryArray(root.agents) ||
    tryArray(root.deliveryAgents) ||
    tryArray(root.requests) ||
    tryArray(root.list) ||
    tryArray(root.items);
  if (direct) return direct;

  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    const nested =
      tryArray(d.agents) ||
      tryArray(d.deliveryAgents) ||
      tryArray(d.requests) ||
      tryArray(d.list) ||
      tryArray(d.items);
    if (nested) return nested;
  }

  return [];
}

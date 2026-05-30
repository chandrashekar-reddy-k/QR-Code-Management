/**
 * Shared helpers for product list / view: API often returns unit type & unit as UUIDs;
 * resolve to labels using master unittypes + units APIs.
 */

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for values that should be resolved via master APIs, not shown as labels. */
export function looksLikeOpaqueId(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (UUID_RE.test(t)) return true;
  if (/^[a-f0-9]{24}$/i.test(t)) return true;
  if (/^\d{6,}$/.test(t)) return true;
  return false;
}

/** Normalize unit / unitType from API (string id or nested { name }). */
export function stringifyUnitField(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "object" && val !== null && typeof (val as { name?: unknown }).name === "string") {
    return String((val as { name: string }).name).trim();
  }
  return String(val).trim();
}

/** Resolve unit type display: human-readable name only (not opaque ids). */
export function resolveUnitType(v: Record<string, unknown>): string {
  const ut = v.unitType ?? v.unit_type ?? v.type;
  if (ut && typeof ut === "object" && typeof (ut as { name?: string }).name === "string")
    return ((ut as { name: string }).name).trim();
  const name = v.unitTypeName ?? v.unit_type_name ?? v.typeName ?? v.type_name;
  if (typeof name === "string" && name.trim()) return name.trim();
  if (typeof ut === "string" && ut.trim() && !looksLikeOpaqueId(ut)) return ut.trim();
  return "";
}

/** Opaque id for unit type (UUID, ObjectId, numeric, or explicit *_id fields). */
export function resolveUnitTypeId(v: Record<string, unknown>): string | undefined {
  const direct = v.unitTypeId ?? v.unit_type_id ?? v.typeId ?? v.type_id;
  if (direct != null && String(direct).trim()) return String(direct).trim();
  const ut = v.unitType ?? v.unit_type ?? v.type;
  if (typeof ut === "string" && looksLikeOpaqueId(ut)) return ut.trim();
  if (ut && typeof ut === "object" && (ut as { id?: string }).id) return String((ut as { id: string }).id).trim();
  return undefined;
}

/** Opaque id for unit row in master list. */
export function resolveUnitId(v: Record<string, unknown>): string | undefined {
  const direct = v.unitId ?? v.unit_id;
  if (direct != null && String(direct).trim()) return String(direct).trim();
  const u = v.unit;
  if (typeof u === "string" && looksLikeOpaqueId(u)) return u.trim();
  if (u && typeof u === "object" && (u as { id?: string }).id) return String((u as { id: string }).id).trim();
  return undefined;
}

/** Resolve unit display: human-readable name / shortCode (not opaque id). */
export function resolveUnit(v: Record<string, unknown>): string {
  const u = v.unit;
  if (u && typeof u === "object" && typeof (u as { name?: string }).name === "string")
    return ((u as { name: string }).name).trim();
  const shortCode = v.unitShortCode ?? v.shortCode ?? v.short_code;
  if (typeof shortCode === "string" && shortCode.trim()) return shortCode.trim();
  const name = v.unitName ?? v.unit_name;
  if (typeof name === "string" && name.trim()) return name.trim();
  if (typeof u === "string" && u.trim() && !looksLikeOpaqueId(u)) return u.trim();
  return "";
}

/** Normalize GET productmanagement/product/unittypes (and similar) to option list. */
export function parseUnitTypesOptions(unitTypesData: unknown): { value: string; label: string }[] {
  const root = unitTypesData as Record<string, unknown> | null | undefined;
  if (!root) return [];
  const unwrap = (x: unknown): unknown => {
    if (Array.isArray(x)) return x;
    if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      const inner = o.data ?? o.unitTypes ?? o.unittypes ?? o.records ?? o.items ?? o.list;
      if (Array.isArray(inner)) return inner;
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        const d2 = (inner as Record<string, unknown>).data ?? (inner as Record<string, unknown>).unitTypes;
        if (Array.isArray(d2)) return d2;
      }
    }
    return null;
  };
  const raw = unwrap(root.data) ?? unwrap(root) ?? (Array.isArray(root) ? root : null);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = row.id ?? row._id ?? row.unitTypeId;
      const label = row.name ?? row.title ?? row.label ?? row.unitTypeName;
      if (id == null) return null;
      const value = String(id);
      const lab = String(label ?? value);
      return { value, label: lab || value };
    })
    .filter((x): x is { value: string; label: string } => x != null);
}

/**
 * Resolve unit type + unit labels for a product or variant row (list / nested table).
 */
export function resolveListRowUnitLabels(
  row: Record<string, unknown>,
  unitTypesOptions: { value: string; label: string }[],
  unitsByTypeId: Record<string, { value: string; label: string }[]>
): { unitType: string; unit: string } {
  let typeDisplay = String(resolveUnitType(row) || row.type || row.unitType || "").trim();
  let unitDisplay = String(resolveUnit(row) || "").trim();
  if (!unitDisplay && typeof row.unit === "string" && row.unit.trim()) {
    unitDisplay = row.unit.trim();
  }

  const unitTypeId = resolveUnitTypeId(row);
  const unitId = resolveUnitId(row);

  if (typeDisplay && looksLikeOpaqueId(typeDisplay) && unitTypesOptions.length > 0) {
    const found = unitTypesOptions.find((o) => String(o.value) === typeDisplay);
    if (found) typeDisplay = found.label;
  }
  if (!typeDisplay && unitTypeId && unitTypesOptions.length > 0) {
    const found = unitTypesOptions.find((o) => String(o.value) === String(unitTypeId));
    if (found) typeDisplay = found.label;
  }

  const utKey =
    unitTypeId ||
    (typeof row.unitType === "string" && looksLikeOpaqueId(row.unitType) ? row.unitType.trim() : undefined);

  if (unitDisplay && looksLikeOpaqueId(unitDisplay) && utKey) {
    const opts = unitsByTypeId[String(utKey)] ?? [];
    const found = opts.find((o) => String(o.value) === unitDisplay);
    if (found) unitDisplay = found.label;
  }
  if (!unitDisplay && utKey && unitId) {
    const opts = unitsByTypeId[String(utKey)] ?? [];
    const found = opts.find((o) => String(o.value) === String(unitId));
    if (found) unitDisplay = found.label;
  }

  return { unitType: typeDisplay, unit: unitDisplay };
}

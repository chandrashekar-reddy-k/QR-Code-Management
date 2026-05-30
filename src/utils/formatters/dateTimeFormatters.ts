import { PickupSlotItem } from "../../hooks/deliverySettings";
import { format, isValid, parse, parseISO } from "date-fns";

/**
 * Convert API date into DD-MM-YYYY display format.
 * Example: formatSlotDate("2026-01-13") -> "13-01-2026"
 */
export const formatSlotDate = (dateStr: string): string => {
  if (!dateStr) return "";
  if (dateStr.includes("T")) {
    const [year, month, day] = dateStr.split("T")[0].split("-");
    if (year && month && day) return `${day}-${month}-${year}`;
  }
  const date = parseISO(dateStr);
  return isValid(date) ? format(date, "dd-MM-yyyy") : dateStr;
};

/**
 * Convert start/end time from 24-hour to 12-hour range.
 * Example: formatSlotTime("09:00", "10:00") -> "9:00 AM - 10:00 AM"
 */
export const formatSlotTime = (start: string, end: string): string => {
  if (!start || !end) return "";
  const toDisplay = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };
  return `${toDisplay(start)} - ${toDisplay(end)}`;
};

/**
 * Convert repeat settings into readable label.
 * Example: formatRepeat({ repeat: true, repeatType: "MON_FRI" } as PickupSlotItem) -> "Mon - Fri"
 */
export const formatRepeat = (slot: PickupSlotItem): string => {
  if (!slot.repeat) return "Once";
  const rt = slot.repeatType;
  if (rt === "MON_FRI") return "Mon - Fri";
  if (rt === "SUN") return "Sun";
  if (rt === "CUSTOM" && slot.customDays?.length) return slot.customDays.join(", ");
  if (rt === "ONCE") return "Once";
  return rt ?? "Once";
};

/**
 * Convert datetime into D-M-YYYY, h:mm AM/PM format.
 * Example: formatDateTime("2026-01-13T10:00:00Z") -> "13-1-2026, 10:00 AM"
 */
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return "-";
  const date = parseISO(dateString);
  return isValid(date) ? format(date, "d-M-yyyy, h:mm a") : "-";
};

/**
 * Convert datetime into DD-MM-YYYY,h:mm AM/PM format.
 * Example: formatCreatedDate("2026-01-13T10:00:00Z") -> "13-01-2026,10:00 AM"
 */
export const formatCreatedDate = (dateString: string): string => {
  if (!dateString) return "-";
  const date = parseISO(dateString);
  return isValid(date) ? format(date, "dd-MM-yyyy,h:mm a") : "-";
};

/**
 * Convert date value to YYYY-MM-DD for date input fields.
 * Example: formatDateForInput("13-01-2026") -> "2026-01-13"
 */
export const formatDateForInput = (dateStr: string): string => {
  if (!dateStr) return "";

  const isoDatePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDatePart)) return isoDatePart;

  const ddMmYyyyDate = parse(dateStr, "dd-MM-yyyy", new Date());
  if (isValid(ddMmYyyyDate)) return format(ddMmYyyyDate, "yyyy-MM-dd");

  const parsedDate = parseISO(dateStr);
  if (isValid(parsedDate)) return format(parsedDate, "yyyy-MM-dd");

  const fallbackDate = new Date(dateStr);
  return isValid(fallbackDate) ? format(fallbackDate, "yyyy-MM-dd") : dateStr;
};

/**
 * Convert repeat type from API format to form radio value.
 * Example: formatRepeatOptionForForm("MON_FRI") -> "mon-fri"
 */
export const formatRepeatOptionForForm = (
  repeatType?: string
): "mon-fri" | "sun" | "customise" => {
  if (repeatType === "MON_FRI") return "mon-fri";
  if (repeatType === "SUN") return "sun";
  return "customise";
};

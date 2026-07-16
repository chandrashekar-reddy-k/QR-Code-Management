export const formatCurrency = (amount: number | undefined | null): string => {
  const validAmount = Number(amount) || 0;
  return `₹${validAmount.toFixed(2)}`;
};

export const formatDate = (dateString: string, format?: string): string => {
  if (!dateString) return "-";

  let normalizedDate = dateString;

  //  ONLY handle strict DD-MM-YYYY format
  const ddmmyyyyRegex = /^\d{2}-\d{2}-\d{4}$/;

  if (ddmmyyyyRegex.test(dateString)) {
    const [day, month, year] = dateString.split("-");
    normalizedDate = `${year}-${month}-${day}`;
  }

  const date = new Date(normalizedDate);

  //  safety check
  if (isNaN(date.getTime())) return "---";

  if (format === "DD-MM-YYYY, HH:mm A") {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    return `${day}-${month}-${year}, ${displayHours}:${minutes} ${ampm}`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export { formatDateTime, formatCreatedDate } from "./dateTimeFormatters";

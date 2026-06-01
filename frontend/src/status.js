export function normalizeWebsiteStatus(status) {
  switch (status) {
    case "Safe":
    case "safe":
      return "safe";
    case "Low_Risk":
    case "low_risk":
    case "Warning":
    case "warning":
    case "warn":
      return "warn";
    case "Blocked":
    case "blocked":
    case "confirmed":
      return "confirmed";
    case "danger":
      return "danger";
    default:
      return status || "info";
  }
}

export function formatApiErrorDetail(detail, fallback = "請求失敗") {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message || String(item))
      .join("; ");
  }
  return detail.message || JSON.stringify(detail);
}

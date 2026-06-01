const HTTP_RE = /^https?:\/\//i;

export function normalizeUserUrlInput(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return HTTP_RE.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isHttpUrl(value) {
  try {
    const url = new URL(normalizeUserUrlInput(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isReportableUrlInput(value) {
  const normalized = normalizeUserUrlInput(value);
  if (!isHttpUrl(normalized)) return false;
  const url = new URL(normalized);
  return Boolean(url.hostname.includes("."));
}

export function openHttpUrl(value) {
  if (!isHttpUrl(value)) return false;
  window.open(normalizeUserUrlInput(value), "_blank", "noopener,noreferrer");
  return true;
}

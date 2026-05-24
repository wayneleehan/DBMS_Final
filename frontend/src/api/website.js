import { apiFetch } from "./client";

export function getWebsites() {
  return apiFetch("/api/v1/websites/");
}
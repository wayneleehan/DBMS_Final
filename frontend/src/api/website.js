import { apiFetch } from "./client";

export function getWebsites() {
  return apiFetch("/websites/");
}

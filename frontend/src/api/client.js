import { formatApiErrorDetail } from "../status.js";

const API_BASE = "/api/v1";  // 用相對路徑走 Vite proxy

export async function apiFetch(path, options = {}) {
    const fullPath = path.startsWith("/api/") ? path : API_BASE + path;
    const isFormData = options.body instanceof FormData;
    const headers = { ...(options.headers || {}) };

    if (!isFormData && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(fullPath, {
        ...options,
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = formatApiErrorDetail(body.detail, `HTTP ${res.status}`);
        const err = new Error(msg);
        err.status = res.status;
        throw err;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

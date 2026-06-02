import { formatApiErrorDetail } from "../status.js";

const API_BASE = "/api/v1";  // 用相對路徑走 Vite proxy
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_EXEMPT_PATHS = new Set(["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/csrf"]);

let csrfToken = null;

export function setCsrfToken(token) {
    csrfToken = token || null;
}

function resolvePath(path) {
    return path.startsWith("/api/") ? path : API_BASE + path;
}

function methodOf(options) {
    return (options.method || "GET").toUpperCase();
}

async function ensureCsrfToken() {
    if (csrfToken) return csrfToken;

    const res = await fetch(API_BASE + "/auth/csrf", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;

    const data = await res.json().catch(() => ({}));
    csrfToken = data.csrf_token || null;
    return csrfToken;
}

export async function apiFetch(path, options = {}) {
    const fullPath = resolvePath(path);
    const method = methodOf(options);
    const isFormData = options.body instanceof FormData;
    const headers = { ...(options.headers || {}) };

    if (!isFormData && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }
    if (UNSAFE_METHODS.has(method) && !CSRF_EXEMPT_PATHS.has(fullPath)) {
        const token = await ensureCsrfToken();
        if (token) headers["X-CSRF-Token"] = token;
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
    const data = text ? JSON.parse(text) : null;
    if (data?.csrf_token) setCsrfToken(data.csrf_token);
    return data;
}

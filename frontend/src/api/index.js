import { apiFetch } from "./client";

async function apiFetch(path, options = {}) {
    const isFormData = options.body instanceof FormData;
    const headers = { ...(options.headers || {}) };

    // 只有在不是FormData時，才預設加上application/json-> 避免圖片被json出現error
    if (!isFormData && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(API_BASE + path, {
        ...options,
        credentials: "include",
        headers,
    });
    
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.detail || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        throw err;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

export const API = {
    login: (role, email, password) =>
        apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ role, email, password }) }),
    register: (name, email, password) =>
        apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
    logout: () => apiFetch("/auth/logout", { method: "POST" }),
    me: () => apiFetch("/auth/me"),
    submitReport: ({ url, category, reason }) =>
        apiFetch("/reports", { method: "POST", body: JSON.stringify({ url, category, reason }) }),
    getMyReports: (limit = 20) => apiFetch(`/users/me/reports?limit=${limit}`),
    getMyStats: () => apiFetch("/users/me/stats"),
    /*submitAppeal: ({ report_id, reason, parent_appeal_id }) =>
        apiFetch("/appeals/", { method: "POST", body: JSON.stringify({ report_id, reason, parent_appeal_id: parent_appeal_id || null }) })*/
    submitAppeal: ({ report_id, reason, parent_appeal_id, files }) => {
        const formData = new FormData();
        formData.append("report_id", report_id);
        formData.append("reason", reason);
    
        if (parent_appeal_id) {
            formData.append("parent_appeal_id", parent_appeal_id);
        }
    
        if (files && files.length > 0) {
            files.forEach((file) => formData.append("files", file));
        }

    // 沿用原本apiFetch
    // 若 apiFetch 內部有強制設定 'Content-Type': 'application/json'，
    // 需要在 apiFetch 內部加判斷，當 body 是 FormData 時不要設定 Content-Type。
        return apiFetch("/appeals/", { 
            method: "POST", 
            body: formData 
        });
    },
    getReviewQueue: (status, limit = 50) => {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        params.set("limit", String(limit));
        return apiFetch(`/admin/queue?${params}`);
    },
    getReviewQueueCounts: () => apiFetch("/admin/queue/counts"),
    submitReview: ({ appeal_id, decision, ruling_result, is_unreasonable = false }) =>
        apiFetch("/admin/review", { method: "POST", body: JSON.stringify({ appeal_id, decision, ruling_result, is_unreasonable }) }),
    submitReportVerdict: ({ report_id, verdict, note }) =>
        apiFetch("/admin/report-verdict", { method: "POST", body: JSON.stringify({ report_id, verdict, note }) }),
};

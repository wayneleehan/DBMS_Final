import { apiFetch } from "./client";

export { apiFetch };

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
    submitAppeal: ({ report_id, reason, parent_appeal_id }) =>
        apiFetch("/appeals/", { method: "POST", body: JSON.stringify({ report_id, reason, parent_appeal_id: parent_appeal_id || null }) }),
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

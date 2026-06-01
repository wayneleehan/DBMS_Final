import { apiFetch } from "./client.js";

export const API = {
    login: (role, email, password) =>
        apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ role, email, password }) }),
    register: (name, email, password) =>
        apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
    logout: () => apiFetch("/auth/logout", { method: "POST" }),
    me: () => apiFetch("/auth/me"),
    submitReport: ({ url, category, reason, files }) => {
        const formData = new FormData();
        formData.append("url", url);
        if (category) formData.append("category", category);
        if (reason) formData.append("reason", reason);

        if (files && files.length > 0) {
            files.forEach((file) => formData.append("files", file));
        }

        return apiFetch("/reports", { 
            method: "POST", 
            body: formData 
        });
    },
    getMyReports: (limit = 20) => apiFetch(`/users/me/reports?limit=${limit}`),
    getMyStats: () => apiFetch("/users/me/stats"),
    getWebsites: () => apiFetch("/websites/"),
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
    getAlerts: (limit = 50) => apiFetch(`/warnings/alerts?limit=${limit}`),
    getAdminHistory: (limit = 6) => apiFetch(`/admin/history?limit=${limit}`),
};

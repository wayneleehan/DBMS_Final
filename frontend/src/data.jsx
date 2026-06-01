// Mock data
import { normalizeWebsiteStatus } from "./status.js";

export const MOCK = {
  user: {
    name: "陳治安",
    initials: "陳",
    email: "zhian.chen@example.com",
    status: "正常",
    joined: "2025-08-12",
    reputation: 84,
    reputationLevel: "資深通報員",
    reputationProgress: 0.62,
    stats: { total: 47, approved: 31, rejected: 9, appeals: 4 },
  },
  admin: {
    name: "王力宏",
    initials: "王",
    email: "lihong.wang@example.com",
    role: "資深審核員",
    permissions: ["審核", "申訴處理", "警報處理"],
    stats: { total: 1284, week: 87, approved: 932, rejected: 352 },
  },
  records: [
    { id: "R-2026-0451", url: "secure-bank-tw.online", type: "舉報", status: "已通過", verdict: "danger", time: "2026-05-12 14:32" },
    { id: "R-2026-0438", url: "shopee-promo-2024.com", type: "舉報", status: "已通過", verdict: "warn", time: "2026-05-09 09:11" },
    { id: "R-2026-0421", url: "national-tax.org.tw.cc", type: "申訴", status: "審核中", verdict: null, time: "2026-05-07 21:47" },
    { id: "R-2026-0395", url: "ubereats-coupon.xyz", type: "舉報", status: "已駁回", verdict: "safe", time: "2026-05-03 18:09" },
    { id: "R-2026-0382", url: "twcrypto-invest.io", type: "舉報", status: "已通過", verdict: "danger", time: "2026-04-29 11:22" },
    { id: "R-2026-0371", url: "line-pay-rewards.app", type: "舉報", status: "已通過", verdict: "warn", time: "2026-04-26 08:54" },
  ],
  websites: [
    { url: "secure-bank-tw.online", domain: "假冒官方網站", risk: 94, status: "danger", reports: 218, updated: "2026-05-12" },
    { url: "twcrypto-invest.io", domain: "投資詐騙", risk: 88, status: "danger", reports: 156, updated: "2026-04-29" },
    { url: "shopee-promo-2024.com", domain: "釣魚網站", risk: 72, status: "warn", reports: 93, updated: "2026-05-09" },
    { url: "line-pay-rewards.app", domain: "釣魚網站", risk: 68, status: "warn", reports: 47, updated: "2026-04-26" },
    { url: "national-tax.org.tw.cc", domain: "假冒官方網站", risk: 61, status: "warn", reports: 32, updated: "2026-05-07" },
    { url: "fastmart-deal.shop", domain: "購物詐騙", risk: 54, status: "warn", reports: 21, updated: "2026-05-10" },
    { url: "blocked-scam-host.ru", domain: "假冒官方網站", risk: 99, status: "confirmed", reports: 412, updated: "2026-03-18" },
    { url: "udn.com", domain: "新聞媒體", risk: 4, status: "safe", reports: 0, updated: "2026-01-22" },
    { url: "pchome.com.tw", domain: "電商平台", risk: 6, status: "safe", reports: 1, updated: "2026-02-11" },
    { url: "easycard-tw.gov.tw", domain: "政府機構", risk: 2, status: "safe", reports: 0, updated: "2025-12-04" },
  ],
  reviewQueue: [
    {
      id: "CASE-3104", appealId: 1, url: "secure-bank-tw.online/login", type: "舉報", cat: "假冒官方網站",
      status: "待審核", risk: 88, submitter: "陳雅婷", reputation: 842, time: "2026-05-13 09:14",
      reason: "假冒銀行登入頁，UI 與官方相似度極高，要求用戶輸入網銀帳號密碼與 OTP，並以「帳戶異常」為由誘導匯款。",
      evidence: ["screenshot-login.png", "screenshot-otp.png", "evidence-log.txt"],
    },
    { id: "CASE-3103", appealId: 2, url: "twcrypto-invest.io", type: "舉報", cat: "投資詐騙", status: "待審核", risk: 81, submitter: "王彥廷", reputation: 612, time: "2026-05-13 08:22" },
    { id: "CASE-3102", appealId: 3, url: "shopee-promo-2024.com", type: "申訴", cat: "釣魚網站", status: "申訴中", risk: 72, submitter: "張怡君", reputation: 1240, time: "2026-05-13 07:48" },
    { id: "CASE-3101", appealId: 4, url: "line-pay-rewards.app", type: "舉報", cat: "釣魚網站", status: "待審核", risk: 65, submitter: "黃柏翔", reputation: 312, time: "2026-05-13 06:30" },
    { id: "CASE-3100", appealId: 5, url: "national-tax.org.tw.cc", type: "申訴", cat: "假冒官方網站", status: "申訴中", risk: 61, submitter: "蔡明軒", reputation: 880, time: "2026-05-12 23:11" },
    { id: "CASE-3099", appealId: 6, url: "fastmart-deal.shop", type: "舉報", cat: "購物詐騙", status: "待審核", risk: 54, submitter: "周品妍", reputation: 420, time: "2026-05-12 19:05" },
  ],
  alerts: [
    { id: "ALERT-882", severity: "critical", type: "大量資料湧入", title: "使用者 林俊宏 在 6 小時內舉報同一網址 84 次", desc: "林俊宏（信譽 240）對 secure-bank-tw.online 連續提交 84 筆通報", time: "10 分鐘前", related: "林俊宏 · U-44182" },
    { id: "ALERT-881", severity: "critical", type: "協同造假", title: "5 個新註冊帳號同時舉報同一目標", desc: "周品妍、黃柏翔、蔡明軒、王彥廷、陳冠廷（皆註冊 < 24h）對 fastmart-deal.shop 提交相同內容舉報", time: "32 分鐘前", related: "5 個帳號" },
    { id: "ALERT-880", severity: "high", type: "高比例封鎖 IP", title: "使用者 張雅婷 申訴駁回率異常偏高", desc: "張雅婷（信譽 180）近 30 日申訴 12 次，全數遭駁回", time: "1 小時前", related: "張雅婷 · U-39821" },
    { id: "ALERT-879", severity: "high", type: "協同造假", title: "3 位使用者提交內容相似度過高", desc: "李宗翰、吳承翰、鄭家豪近 24h 內提交 9 筆舉報，文字相似度 > 92%", time: "3 小時前", related: "3 個帳號" },
    { id: "ALERT-878", severity: "medium", type: "大量資料湧入", title: "使用者 蘇佳穎 通報頻率突增", desc: "蘇佳穎（信譽 560）過去 24h 通報量較平均 +340%", time: "今日 06:12", related: "蘇佳穎 · U-51209" },
    { id: "ALERT-877", severity: "low", type: "高比例封鎖 IP", title: "使用者 楊明達 通過率長期偏低", desc: "楊明達（信譽 320）近 7 日通報，60% 經審核為惡意誤報", time: "昨日", related: "楊明達 · U-28173" },
  ],
};

export function statusToCaseDisplay(status) {
  switch (status) {
    case "Blocked":  return { caseStatus: "已通過", verdict: "danger" };
    case "Warning":  return { caseStatus: "已通過", verdict: "warn" };
    case "Low_Risk": return { caseStatus: "審核中", verdict: null };
    case "Safe":     return { caseStatus: "已駁回", verdict: "safe" };
    default:         return { caseStatus: status, verdict: null };
  }
}

export function reputationLevel(score) {
  if (score >= 80) return "資深通報員";
  if (score >= 50) return "活躍通報員";
  if (score >= 20) return "新通報員";
  return "觀察中";
}

export function statusMeta(s) {
  const status = normalizeWebsiteStatus(s);
  return ({
    safe:      { label: "安全",         cls: "safe" },
    warn:      { label: "可疑",         cls: "warn" },
    danger:    { label: "高風險",       cls: "danger" },
    confirmed: { label: "已確認為詐騙", cls: "danger" },
    info:      { label: "資訊",         cls: "info" },
  }[status] || { label: status, cls: "muted" });
}

export function caseStatusMeta(s) {
  return ({
    "待審核": { cls: "warn" },
    "已通過": { cls: "safe" },
    "已駁回": { cls: "muted" },
    "審核中": { cls: "info" },
    "申訴中": { cls: "info" },
  }[s] || { cls: "muted" });
}

export function riskColor(r) {
  return r >= 80 ? "#EF4444" : r >= 50 ? "#F59E0B" : r >= 20 ? "#3B82F6" : "#22C55E";
}

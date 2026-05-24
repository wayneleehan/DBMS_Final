import React from "react";
import { MOCK, riskColor, statusToCaseDisplay, reputationLevel } from "./data.jsx";
import { API } from "./api/index.js";
import { I, StatusBadge, CaseBadge } from "./components.jsx";

// ===== LOGIN PAGE =====
export function LoginPage({ onLogin }) {
    const [role, setRole] = React.useState("user");
    const [email, setEmail] = React.useState("");
    const [pwd, setPwd] = React.useState("");
    const [remember, setRemember] = React.useState(true);
    const [err, setErr] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [modal, setModal] = React.useState(null); // "register" | "forgot" | null

    React.useEffect(() => { setErr(null); }, [role]);

    async function tryLogin() {
        setErr(null);
        if (!email.trim() || !pwd) {
            setErr("請輸入 Email 與密碼");
            return;
        }
        setLoading(true);
        try {
            const { user } = await API.login(role, email.trim(), pwd);
            onLogin(user);  // 成功:把後端回的 UserInfo 交給 App 設 state
        } catch (e) {
            setErr(e.message || "登入失敗");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-shell">
            <div className="login-header" style={{ height: "120px" }}>
                <div className="login-wordmark">
                    ANTIFRAUD<span className="dot"></span>
                    <small></small>
                </div>
                <div className="login-notch"></div>
            </div>

            <div className="login-form-wrap">
                <div className="login-form" style={{ width: "420px" }}>
                    <h2 style={{ margin: "0 0 6px", fontSize: 22, letterSpacing: "-0.01em" }}>登入帳號</h2>
                    <p style={{ color: "var(--text-3)", fontSize: 13, margin: "0 0 24px" }}>請選擇身分並輸入帳號密碼</p>

                    <div className="role-toggle">
                        <button className={role === "user" ? "active" : ""} onClick={() => setRole("user")}>使用者</button>
                        <button className={role === "admin" ? "active" : ""} onClick={() => setRole("admin")}>管理員</button>
                    </div>

                    <div className="field">
                        <label>{role === "admin" ? "管理員 Email" : "Email / 帳號"}</label>
                        <div className="input-prefix">
                            <span className="pfx">{I.mail}</span>
                            <input value={email} onChange={(e) => { setEmail(e.target.value); setErr(null); }} placeholder="you@example.com" />
                        </div>
                    </div>

                    <div className="field">
                        <label>密碼</label>
                        <div className="input-prefix">
                            <span className="pfx">{I.lock}</span>
                            <input type="password" value={pwd} onChange={(e) => { setPwd(e.target.value); setErr(null); }} placeholder="••••••••" />
                        </div>
                    </div>

                    {err &&
                        <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--danger-bg)", border: "1px solid #FECACA", color: "#B91C1C", fontSize: 12.5, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                            {I.warn}<span>{err}</span>
                        </div>
                    }

                    <div className="login-extras">
                        <label><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> 記住我</label>
                    </div>

                    <button className="btn primary block" onClick={tryLogin} disabled={loading}
                        style={{ justifyContent: "center", padding: "10px 16px", fontSize: 14, opacity: loading ? 0.7 : 1 }}>
                        {loading ? "登入中…" : "登入"}
                    </button>

                    <div className="login-foot" style={{ marginTop: 20 }}>
                        {role === "admin" ?
                            <span style={{ color: "var(--text-3)" }}>管理員帳號由系統管理者建立，無法自行註冊</span> :
                            <React.Fragment>還沒有帳號？<a href="#" onClick={(e) => { e.preventDefault(); setModal("register"); }}>立即註冊</a></React.Fragment>
                        }
                    </div>
                </div>
            </div>

            <div className="login-foot-bar">v3.2.0 · © 2026 AntiFraud Initiative</div>

            {modal === "register" && (
                <RegisterModal
                    onClose={() => setModal(null)}
                    onDone={() => { setModal(null); setErr(null); }}
                    onRegistered={(user) => onLogin(user)}
                />
            )}
            {modal === "forgot" && <ForgotPasswordModal onClose={() => setModal(null)} defaultEmail={email} />}
        </div>
    );
}

// ===== AUTH MODALS =====
function Modal({ title, subtitle, stamp, onClose, children, footer }) {
    React.useEffect(() => {
        function onKey(e) { if (e.key === "Escape") onClose(); }
        window.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    }, [onClose]);
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <div>
                        <h3>{title}</h3>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="關閉">{I.close}</button>
                </div>
                {stamp && <div className="modal-stamp">{stamp}</div>}
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-foot">{footer}</div>}
            </div>
        </div>
    );
}

function RegisterModal({ onClose, onDone, onRegistered }) {
    const [step, setStep] = React.useState("form");
    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [pwd, setPwd] = React.useState("");
    const [pwd2, setPwd2] = React.useState("");
    const [err, setErr] = React.useState({});
    const [submitting, setSubmitting] = React.useState(false);

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pwdScore = (() => {
        let s = 0;
        if (pwd.length >= 8) s++;
        if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
        if (/\d/.test(pwd)) s++;
        if (/[^A-Za-z0-9]/.test(pwd)) s++;
        return s;
    })();
    const pwdLabels = ["太弱", "普通", "良好", "強"];
    const pwdColors = ["var(--danger)", "var(--warn)", "var(--info)", "var(--safe)"];

    async function submit() {
        const e = {};
        if (!name.trim()) e.name = "請輸入顯示名稱";
        if (!EMAIL_RE.test(email.trim())) e.email = "Email 格式不正確";
        if (pwd.length < 8) e.pwd = "密碼至少 8 個字元";
        if (pwd !== pwd2) e.pwd2 = "兩次輸入的密碼不一致";
        setErr(e);
        if (Object.keys(e).length !== 0) return;
        setSubmitting(true);
        try {
            const { user } = await API.register(name.trim(), email.trim(), pwd);
            if (onRegistered) onRegistered(user);
            setStep("done");
        } catch (ex) {
            setErr({ submit: ex.message || "註冊失敗,請稍後再試" });
        } finally {
            setSubmitting(false);
        }
    }

    if (step === "done") {
        return (
            <Modal title="帳號建立成功" subtitle="您已自動登入,可開始使用" stamp="REG · ACK" onClose={onDone}
                footer={<button className="btn primary" onClick={onDone} style={{ padding: "10px 18px" }}>進入系統</button>}>
                <div style={{ padding: "20px", borderRadius: 10, background: "var(--orange-light)", border: "1px solid var(--orange-soft)", display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", display: "grid", placeItems: "center", color: "var(--orange)", flexShrink: 0 }}>{I.check}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-2)" }}>
                        歡迎,<span className="mono" style={{ color: "var(--text)", fontWeight: 500 }}>{email}</span>
                        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-3)" }}>關閉此視窗後將進入個人頁面。</div>
                    </div>
                </div>
                <ul style={{ margin: "16px 0 4px", padding: "0 0 0 18px", fontSize: 12.5, color: "var(--text-3)", lineHeight: 1.8 }}>
                    <li>新帳號預設信譽積分為 <strong style={{ color: "var(--text-2)" }}>100</strong></li>
                    <li>首次通報前，建議先閱讀社群準則</li>
                    <li>連續駁回率過高將觸發人工審核</li>
                </ul>
            </Modal>
        );
    }

    return (
        <Modal title="建立帳號" subtitle="加入 AntiFraud · 一同回報可疑網站，建立更安全的網路環境" stamp="REG · NEW USER" onClose={onClose}
            footer={
                <React.Fragment>
                    <button className="btn ghost" onClick={onClose} disabled={submitting}>取消</button>
                    <button className="btn primary" onClick={submit} disabled={submitting} style={{ padding: "10px 18px", opacity: submitting ? 0.7 : 1 }}>
                        {submitting ? "建立中…" : "建立帳號"}
                    </button>
                </React.Fragment>
            }>
            {err.submit && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--danger-bg)", border: "1px solid #FECACA", color: "#B91C1C", fontSize: 12.5, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    {I.warn}<span>{err.submit}</span>
                </div>
            )}
            <div className="field">
                <label>顯示名稱 <span style={{ color: "var(--danger)" }}>*</span></label>
                <div className="input-prefix" style={err.name ? { borderColor: "var(--danger)" } : {}}>
                    <span className="pfx">{I.user}</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="陳怡婷" />
                </div>
                {err.name && <div className="err">{I.warn}{err.name}</div>}
            </div>
            <div className="field">
                <label>Email <span style={{ color: "var(--danger)" }}>*</span></label>
                <div className="input-prefix" style={err.email ? { borderColor: "var(--danger)" } : {}}>
                    <span className="pfx">{I.mail}</span>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                {err.email ? <div className="err">{I.warn}{err.email}</div> : <div className="hint">將用於登入與接收審核通知</div>}
            </div>
            <div className="field">
                <label>密碼 <span style={{ color: "var(--danger)" }}>*</span></label>
                <div className="input-prefix" style={err.pwd ? { borderColor: "var(--danger)" } : {}}>
                    <span className="pfx">{I.lock}</span>
                    <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="至少 8 字元，含大小寫與數字" />
                </div>
                {pwd && (
                    <div style={{ marginTop: 8, display: "flex", gap: 4, alignItems: "center" }}>
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < pwdScore ? pwdColors[pwdScore - 1] : "var(--bg-tint)", transition: "background .15s" }}></div>
                        ))}
                        <span className="mono" style={{ fontSize: 10.5, color: pwdScore > 0 ? pwdColors[pwdScore - 1] : "var(--text-4)", marginLeft: 6, minWidth: 32, textAlign: "right" }}>
                            {pwdScore > 0 ? pwdLabels[pwdScore - 1] : "—"}
                        </span>
                    </div>
                )}
                {err.pwd && <div className="err">{I.warn}{err.pwd}</div>}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
                <label>確認密碼 <span style={{ color: "var(--danger)" }}>*</span></label>
                <div className="input-prefix" style={err.pwd2 ? { borderColor: "var(--danger)" } : {}}>
                    <span className="pfx">{I.lock}</span>
                    <input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="再次輸入密碼" />
                </div>
                {err.pwd2 && <div className="err">{I.warn}{err.pwd2}</div>}
            </div>
        </Modal>
    );
}

function ForgotPasswordModal({ onClose, defaultEmail }) {
    const [email, setEmail] = React.useState(defaultEmail || "");
    const [sent, setSent] = React.useState(false);
    const [err, setErr] = React.useState(null);
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function submit() {
        if (!EMAIL_RE.test(email.trim())) { setErr("請輸入正確的 Email 格式"); return; }
        setErr(null);
        setSent(true);
    }

    if (sent) {
        return (
            <Modal title="重設密碼信件已寄出" subtitle="請於 30 分鐘內點擊連結完成重設" stamp="PWD · RESET-REQ" onClose={onClose}
                footer={<button className="btn primary" onClick={onClose} style={{ padding: "10px 18px" }}>完成</button>}>
                <div style={{ padding: "20px", borderRadius: 10, background: "var(--bg-soft)", border: "1px solid var(--border)", display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--orange)", flexShrink: 0 }}>{I.mail}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-2)" }}>
                        已寄送至 <span className="mono" style={{ color: "var(--text)", fontWeight: 500 }}>{email}</span>
                        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-3)" }}>基於安全考量，無論該 Email 是否註冊過，皆會顯示此訊息。</div>
                    </div>
                </div>
                <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
                    沒收到信？<a href="#" onClick={(e) => { e.preventDefault(); setSent(false); }} style={{ color: "var(--orange)", textDecoration: "none", fontWeight: 500 }}>重新寄送</a>
                </div>
            </Modal>
        );
    }

    return (
        <Modal title="重設密碼" subtitle="輸入註冊時使用的 Email，我們會寄送重設連結" stamp="PWD · RECOVERY" onClose={onClose}
            footer={
                <React.Fragment>
                    <button className="btn ghost" onClick={onClose}>取消</button>
                    <button className="btn primary" onClick={submit} style={{ padding: "10px 18px" }}>寄送重設連結</button>
                </React.Fragment>
            }>
            <div className="field" style={{ marginBottom: 6 }}>
                <label>Email</label>
                <div className="input-prefix" style={err ? { borderColor: "var(--danger)" } : {}}>
                    <span className="pfx">{I.mail}</span>
                    <input value={email} onChange={(e) => { setEmail(e.target.value); setErr(null); }} placeholder="you@example.com" autoFocus />
                </div>
                {err ? <div className="err">{I.warn}{err}</div> : <div className="hint">重設連結 30 分鐘內有效</div>}
            </div>
            <div style={{ marginTop: 18, padding: "12px 14px", borderRadius: 8, background: "var(--bg-soft)", border: "1px dashed var(--border)", fontSize: 11.5, color: "var(--text-3)", lineHeight: 1.65 }}>
                <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6 }}>
                    {I.shield}帳號安全提示
                </div>
                若你並未提出重設請求，請忽略我們寄出的信件，或聯絡 <span className="mono" style={{ color: "var(--text-2)" }}>support@antifraud.gov</span>。
            </div>
        </Modal>
    );
}

// ===== USER: PROFILE =====
export function UserProfile({ user }) {
    // user 是後端 /auth/login 或 /auth/me 回的 UserInfo:
    //   { id, role, email, name, reliability_score, admin_role, created_at }
    const [stats, setStats] = React.useState({ total: 0, approved: 0, rejected: 0, appeals: 0 });
    const [records, setRecords] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        Promise.all([API.getMyStats(), API.getMyReports(6)])
            .then(([s, r]) => { setStats(s); setRecords(r); })
            .catch((e) => console.error("Failed to load profile data:", e))
            .finally(() => setLoading(false));
    }, []);

    const u = {
        name: user?.name || "—",
        initials: user?.name ? user.name[0] : "?",
        email: user?.email || "",
        joined: user?.created_at ? user.created_at.slice(0, 10) : "—",
        reputation: Math.round(user?.reliability_score ?? 0),
        reputationLevel: reputationLevel(user?.reliability_score ?? 0),
        stats,
    };

    return (
        <div className="content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">個人頁面</h1>
                    <p className="page-sub">查看你的帳號資訊、信譽積分與通報紀錄</p>
                </div>
                <div className="row">
                    <button className="btn ghost">編輯個人資料</button>
                </div>
            </div>

            <div className="row" style={{ gap: 12, marginBottom: 20, alignItems: "stretch" }}>

                {/* 信譽積分 */}
                <div className="card" style={{ flex: 1, borderTop: "3px solid var(--orange)" }}>
                    <div className="card-body">
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>信譽積分</div>
                        <div className="num" style={{ fontSize: 40, fontWeight: 700, color: "var(--orange)", lineHeight: 1 }}>
                            {u.reputation ?? 78}
                        </div>
                        <div style={{ margin: "12px 0 6px", height: 6, background: "var(--bg-tint)", borderRadius: 20, overflow: "hidden" }}>
                            <div style={{ width: (u.reputation ?? 78) + "%", height: "100%", background: "var(--orange)", borderRadius: 20 }} />
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>滿分 100</div>
                    </div>
                </div>

                {/* 通報總數 */}
                <div className="card" style={{ flex: 1, borderTop: "3px solid var(--info)" }}>
                    <div className="card-body">
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>通報總數</div>
                        <div className="num" style={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>
                            {u.stats.total}
                        </div>
                    </div>
                </div>
            </div>
            {/* User info */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-body">
                    <div className="row" style={{ gap: 16 }}>
                        <div className="avatar" style={{ width: 52, height: 52, fontSize: 18 }}>{u.initials}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 17, fontWeight: 600 }}>{u.name}</div>
                            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{u.email}</div>
                        </div>
                        <div className="row" style={{ gap: 24 }}>
                            <div><div style={{ fontSize: 11, color: "var(--text-3)" }}>帳號狀態</div><div style={{ marginTop: 4 }}><StatusBadge status="safe" /></div></div>
                            <div><div style={{ fontSize: 11, color: "var(--text-3)" }}>加入日期</div><div className="num" style={{ marginTop: 4, fontSize: 13 }}>{u.joined}</div></div>
                            <div><div style={{ fontSize: 11, color: "var(--text-3)" }}>身分</div><div style={{ marginTop: 4, fontSize: 13 }}>一般使用者</div></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Records */}
            <div className="card">
                <div className="card-h">
                    <div><h3>通報紀錄</h3><div className="sub">最近 {records.length} 筆 · 共 {u.stats.total} 筆</div></div>
                    <div className="row"><button className="btn ghost sm">查看全部</button></div>
                </div>
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{ width: 120 }}>案件編號</th>
                            <th>網址</th>
                            <th style={{ width: 90 }}>類型</th>
                            <th style={{ width: 120 }}>狀態</th>
                            <th style={{ width: 120 }}>判定</th>
                            <th style={{ width: 160 }}>提交時間</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-3)", padding: 24 }}>載入中…</td></tr>
                        ) : records.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-3)", padding: 24 }}>尚無通報紀錄</td></tr>
                        ) : records.map((r) => {
                            const display = statusToCaseDisplay(r.status);
                            return (
                                <tr key={r.report_id}>
                                    <td className="mono" style={{ fontSize: 12 }}>R-{String(r.report_id).padStart(6, "0")}</td>
                                    <td className="url-cell">{r.url}</td>
                                    <td><span className="badge muted">舉報</span></td>
                                    <td><CaseBadge status={display.caseStatus} /></td>
                                    <td>{display.verdict ? <StatusBadge status={display.verdict} /> : <span style={{ color: "var(--text-4)" }}>—</span>}</td>
                                    <td className="num" style={{ fontSize: 12, color: "var(--text-3)" }}>{r.timestamp ? r.timestamp.replace("T", " ").slice(0, 16) : "—"}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ===== USER: REPORT =====
export function UserReport() {
    const [tab, setTab] = React.useState("report");
    const [submitted, setSubmitted] = React.useState(false);
    const [result, setResult] = React.useState(null);  // 後端 /reports 回的 {url, status, risk_score, is_new}

    return (
        <div className="content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">通報</h1>
                    <p className="page-sub">幫助系統更安全 · 你的每一筆通報都會被審核</p>
                </div>
            </div>
            <div className="tabs">
                <button className={"tab" + (tab === "report" ? " active" : "")} onClick={() => { setTab("report"); setSubmitted(false); setResult(null); }}>
                    舉報 <span className="tab-badge">未審核</span>
                </button>
                <button className={"tab" + (tab === "appeal" ? " active" : "")} onClick={() => { setTab("appeal"); setSubmitted(false); setResult(null); }}>
                    申訴 <span className="tab-badge">已有結果</span>
                </button>
            </div>
            {submitted ? (
                <SubmittedCard onBack={() => { setSubmitted(false); setResult(null); }} type={tab} result={result} />
            ) : tab === "report" ? (
                <ReportForm onSubmit={(r) => { setResult(r); setSubmitted(true); }} />
            ) : (
                <AppealForm onSubmit={(r) => { setResult(r); setSubmitted(true); }} />
            )}
        </div>
    );
}

function SubmittedCard({ onBack, type, result }) {
    // result 形狀依 type 不同:
    //   舉報:{url, status, risk_score, is_new}
    //   申訴:{status: "success", message, appeal_id }
    const isAppeal = type === "appeal";
    return (
        <div className="card" style={{ maxWidth: 680, margin: "32px auto", textAlign: "center" }}>
            <div className="card-body" style={{ padding: "48px 24px" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--orange-light)", display: "grid", placeItems: "center", margin: "0 auto 16px", color: "var(--orange)" }}>
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
                </div>
                <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>{isAppeal ? "申訴" : "舉報"}已送出</h2>
                {isAppeal && result ? (
                    <>
                        <p style={{ color: "var(--text-3)", fontSize: 14, margin: "0 0 8px" }}>
                            案件編號 <span className="mono">A-{String(result.appeal_id || 0).padStart(6, "0")}</span>
                        </p>
                        <p style={{ color: "var(--text-3)", fontSize: 13, margin: "0 0 24px" }}>
                            {result.message || "管理員將盡速複核你的申訴"}
                        </p>
                    </>
                ) : !isAppeal && result ? (
                    <>
                        <p style={{ color: "var(--text-3)", fontSize: 13, margin: "0 0 16px", wordBreak: "break-all" }}>
                            <span className="mono">{result.url}</span>
                        </p>
                        <div style={{ display: "inline-flex", gap: 12, padding: "12px 18px", background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 18, alignItems: "center" }}>
                            <div style={{ textAlign: "left" }}>
                                <div style={{ fontSize: 11, color: "var(--text-3)" }}>系統判定</div>
                                <div style={{ marginTop: 4 }}>
                                    <span className="badge" style={{ background: riskColor(result.risk_score) + "1A", color: riskColor(result.risk_score) }}>{result.status}</span>
                                </div>
                            </div>
                            <div style={{ width: 1, height: 28, background: "var(--border)" }}></div>
                            <div style={{ textAlign: "left" }}>
                                <div style={{ fontSize: 11, color: "var(--text-3)" }}>風險分數</div>
                                <div className="num" style={{ fontSize: 18, fontWeight: 600, color: riskColor(result.risk_score) }}>{Math.round(result.risk_score)}</div>
                            </div>
                            <div style={{ width: 1, height: 28, background: "var(--border)" }}></div>
                            <div style={{ textAlign: "left" }}>
                                <div style={{ fontSize: 11, color: "var(--text-3)" }}>類別</div>
                                <div style={{ fontSize: 12, marginTop: 2 }}>{result.is_new ? "新通報" : "已知網址"}</div>
                            </div>
                        </div>
                        <p style={{ color: "var(--text-3)", fontSize: 12, margin: "0 0 24px" }}>你的通報已紀錄於審核佇列,管理員審核後將會更新判定結果。</p>
                    </>
                ) : (
                    <p style={{ color: "var(--text-3)", fontSize: 14, margin: "0 0 24px" }}>我們將在 24 小時內回覆審核結果</p>
                )}
                <div className="row" style={{ justifyContent: "center", gap: 10 }}>
                    <button className="btn ghost" onClick={onBack}>返回填寫</button>
                    <button className="btn primary">前往紀錄查看</button>
                </div>
            </div>
        </div>
    );
}

function ReportForm({ onSubmit }) {
    const [url, setUrl] = React.useState("");
    const [cat, setCat] = React.useState("假冒官方網站");
    const [reason, setReason] = React.useState("");
    const [files, setFiles] = React.useState([]);
    const [urlErr, setUrlErr] = React.useState(null);
    const [submitErr, setSubmitErr] = React.useState(null);
    const [submitting, setSubmitting] = React.useState(false);
    const cats = ["假冒官方網站", "釣魚網站", "投資詐騙", "購物詐騙", "其他"];

    // URL validation: domain.tld with optional path, no spaces
    const URL_RE = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(\/[^\s]*)?$/i;
    const urlValid = URL_RE.test(url.trim());
    const ok = urlValid && !submitting;

    function handleUrl(v) {
        setUrl(v);
        if (!v.trim()) { setUrlErr(null); return; }
        if (!URL_RE.test(v.trim())) setUrlErr("網址格式不正確 · 例:example.com 或 example.com/path");
        else setUrlErr(null);
    }

    async function submit() {
        if (!urlValid) { setUrlErr("請輸入正確的網址格式"); return; }
        setSubmitErr(null);
        setSubmitting(true);
        try {
            // 補上 https:// 讓 backend 跟 extension 的格式一致(extension 也送完整 URL)
            const fullUrl = "https://" + url.trim();
            const result = await API.submitReport({ url: fullUrl, category: cat, reason: reason || null });
            onSubmit(result);  // 把後端回的 {url, status, risk_score, is_new} 帶上去
        } catch (e) {
            // 401 表示 session 過期(雖然外層 App 會擋住未登入,但保險)
            if (e.status === 401) setSubmitErr("登入狀態已失效,請重新登入");
            else setSubmitErr(e.message || "送出失敗,請稍後再試");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="card" style={{ maxWidth: 820 }}>
            <div className="card-h"><h3>舉報</h3><span className="sub">尚未被系統審核過的網址</span></div>
            <div className="card-body">
                <div className="field">
                    <label>網址 <span style={{ color: "var(--danger)" }}>*</span></label>
                    <div className="input-prefix" style={urlErr ? { borderColor: "var(--danger)" } : {}}>
                        <span className="pfx">https://</span>
                        <input value={url} onChange={(e) => handleUrl(e.target.value)} placeholder="example.com/suspicious-page" />
                    </div>
                    {urlErr ? <div className="err">{I.warn}{urlErr}</div> : <div className="hint">請完整貼上你看到的網址，包含路徑</div>}
                </div>
                <div className="field">
                    <label>可疑類型 <span style={{ color: "var(--danger)" }}>*</span></label>
                    <div className="chips">
                        {cats.map((c) => <button key={c} className={"chip" + (cat === c ? " active" : "")} onClick={() => setCat(c)}>{c}</button>)}
                    </div>
                </div>
                <div className="field">
                    <label>舉報理由 <span style={{ fontSize: 11, color: "var(--text-3)" }}>(選填)</span></label>
                    <textarea className="textarea" rows="5" value={reason} onChange={(e) => setReason(e.target.value)}
                        placeholder="請描述你看到的可疑行為，例如：「該網站要求輸入網銀 OTP，但網域不是官方網域。」"></textarea>
                    <div className="hint">詳細描述有助於加快審核 ({reason.length} / 500)</div>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                    <label>證據 <span style={{ fontSize: 11, color: "var(--text-3)" }}>(選填)</span></label>
                    <DropZone files={files} setFiles={setFiles} />
                    <div className="hint">支援 PNG / JPG / PDF · 單檔最大 10MB</div>
                </div>
            </div>
            {submitErr && (
                <div style={{ margin: "0 24px 16px", padding: "10px 12px", borderRadius: 8, background: "var(--danger-bg)", border: "1px solid #FECACA", color: "#B91C1C", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
                    {I.warn}<span>{submitErr}</span>
                </div>
            )}
            <div className="card-foot">
                <button className="btn ghost" disabled={submitting}>儲存草稿</button>
                <button className="btn primary" disabled={!ok} onClick={submit} style={{ opacity: ok ? 1 : .5 }}>
                    {submitting ? "送出中…" : "送出舉報"}
                </button>
            </div>
        </div>
    );
}

function AppealForm({ onSubmit }) {
    // 申訴必須挑一筆「自己的通報」(後端 APPEAL 表 FK 到 Report_ID)
    // UI:輸入框可打字搜尋,下面浮出符合的通報供點選;選中後自動填好 verdict box
    const [query, setQuery] = React.useState("");
    const [selectedReport, setSelectedReport] = React.useState(null);
    const [reason, setReason] = React.useState("");
    const [files, setFiles] = React.useState([]);
    const [myReports, setMyReports] = React.useState([]);
    const [loadingReports, setLoadingReports] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);
    const [submitErr, setSubmitErr] = React.useState(null);

    // 載入使用者所有通報供搜尋
    React.useEffect(() => {
        API.getMyReports(100)
            .then(setMyReports)
            .catch((e) => console.error("Load reports failed:", e))
            .finally(() => setLoadingReports(false));
    }, []);

    // 過濾邏輯:有打字才過濾,沒打字顯示全部最近的
    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return myReports.slice(0, 6);
        return myReports.filter((r) => r.url.toLowerCase().includes(q)).slice(0, 6);
    }, [query, myReports]);

    const ok = selectedReport && reason.trim().length > 0 && !submitting;

    async function submit() {
        if (!selectedReport) { setSubmitErr("請從下方選擇要申訴的通報"); return; }
        if (!reason.trim()) { setSubmitErr("請填寫申訴原因"); return; }
        setSubmitErr(null);
        setSubmitting(true);
        try {
            const result = await API.submitAppeal({ report_id: selectedReport.report_id, reason: reason.trim() });
            onSubmit(result);
        } catch (e) {
            setSubmitErr(e.status === 401 ? "登入狀態已失效,請重新登入" : (e.message || "送出失敗"));
        } finally {
            setSubmitting(false);
        }
    }

    const selDisplay = selectedReport ? statusToCaseDisplay(selectedReport.status) : null;

    return (
        <div className="card" style={{ maxWidth: 820 }}>
            <div className="card-h"><h3>申訴審核結果</h3><span className="sub">對自己的通報判定結果有異議</span></div>
            <div className="card-body">
                <div className="field">
                    <label>選擇要申訴的通報 <span style={{ color: "var(--danger)" }}>*</span></label>
                    <div className="input-prefix">
                        <span className="pfx">{I.search}</span>
                        <input value={query} onChange={(e) => { setQuery(e.target.value); setSelectedReport(null); }}
                            placeholder={loadingReports ? "載入中…" : "輸入網址搜尋,或從下方挑選"} disabled={loadingReports} />
                    </div>
                    {!selectedReport && !loadingReports && (
                        <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 10, maxHeight: 260, overflowY: "auto", background: "#fff" }}>
                            {filtered.length === 0 ? (
                                <div style={{ padding: 14, fontSize: 13, color: "var(--text-3)" }}>
                                    {myReports.length === 0 ? "你還沒有任何通報。請先到「舉報」分頁通報網址。" : "沒有符合的通報,請調整關鍵字或先到「舉報」分頁通報。"}
                                </div>
                            ) : filtered.map((r) => (
                                <button key={r.report_id} onClick={() => { setSelectedReport(r); setQuery(r.url); }}
                                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", fontSize: 13 }}>
                                    <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                                        <span className="mono" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.url}</span>
                                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{r.timestamp ? r.timestamp.replace("T", " ").slice(0, 16) : ""}</span>
                                        <StatusBadge status={statusToCaseDisplay(r.status).verdict || "info"} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    {selectedReport && (
                        <div className="hint" style={{ marginTop: 6 }}>
                            已選擇:<span className="mono">R-{String(selectedReport.report_id).padStart(6, "0")}</span>
                            <a href="#" onClick={(e) => { e.preventDefault(); setSelectedReport(null); setQuery(""); }} style={{ marginLeft: 10, color: "var(--orange)" }}>更換</a>
                        </div>
                    )}
                </div>

                {/* current verdict box */}
                {selectedReport && (
                    <div className="field">
                        <label>目前判定結果</label>
                        <div style={{ border: "1px solid var(--border)", background: "var(--bg-soft)", borderRadius: 10, padding: 16 }}>
                            <div className="row between" style={{ marginBottom: 10 }}>
                                <span style={{ fontSize: 13, color: "var(--text-3)" }}>系統判定</span>
                                {selDisplay.verdict ? <StatusBadge status={selDisplay.verdict} /> : <span className="badge muted">{selDisplay.caseStatus}</span>}
                            </div>
                            <div className="row" style={{ gap: 24 }}>
                                <div>
                                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>風險分數</div>
                                    <div className="num" style={{ fontSize: 22, fontWeight: 600, color: riskColor(selectedReport.risk_score) }}>{Math.round(selectedReport.risk_score)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>類別</div>
                                    <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedReport.category || "—"}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>通報時間</div>
                                    <div className="num" style={{ fontSize: 13 }}>{selectedReport.timestamp ? selectedReport.timestamp.replace("T", " ").slice(0, 16) : "—"}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* reason + evidence */}
                <div className="field">
                    <label>申訴原因 <span style={{ color: "var(--danger)" }}>*</span></label>
                    <textarea className="textarea" rows="5" value={reason} onChange={(e) => setReason(e.target.value)}
                        placeholder="請說明為何判定結果有誤,並提供支持你論點的事實。"></textarea>
                    <div style={{ marginTop: 10 }}><DropZone files={files} setFiles={setFiles} /></div>
                    <div className="hint">補充證據檔可加快審核(目前僅 UI 顯示,尚未上傳到伺服器)</div>
                </div>
            </div>

            {submitErr && (
                <div style={{ margin: "0 24px 16px", padding: "10px 12px", borderRadius: 8, background: "var(--danger-bg)", border: "1px solid #FECACA", color: "#B91C1C", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
                    {I.warn}<span>{submitErr}</span>
                </div>
            )}
            <div className="card-foot">
                <button className="btn ghost" disabled={submitting}>取消</button>
                <button className="btn primary" disabled={!ok} onClick={submit} style={{ opacity: ok ? 1 : .5 }}>
                    {submitting ? "送出中…" : "送出申訴"}
                </button>
            </div>
        </div>
    );
}

function DropZone({ files, setFiles }) {
    const [drag, setDrag] = React.useState(false);
    return (
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); setFiles([...files, ...Array.from(e.dataTransfer.files).map((f) => f.name)]); }}
            style={{ border: "1.5px dashed " + (drag ? "var(--orange)" : "var(--border-strong)"), background: drag ? "var(--orange-light)" : "var(--bg-soft)", borderRadius: 10, padding: "22px 16px", textAlign: "center", color: "var(--text-3)", fontSize: 13, transition: "all .15s" }}>
            <div style={{ display: "grid", placeItems: "center", margin: "0 auto 8px", width: 36, height: 36, borderRadius: 8, background: "#fff", border: "1px solid var(--border)", color: "var(--text-2)" }}>{I.upload}</div>
            <div>拖曳檔案到此 · 或 <span style={{ color: "var(--orange)", fontWeight: 500, cursor: "pointer" }}>點此選擇</span></div>
            {files.length > 0 && (
                <div className="row" style={{ gap: 6, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    {files.map((f, i) => <span key={i} className="muted-tag">{f}</span>)}
                </div>
            )}
        </div>
    );
}

// ===== USER: WEBSITE OVERVIEW =====
export function WebsiteOverview() {
    const [filter, setFilter] = React.useState("all");
    const [q, setQ] = React.useState("");
    const [websites, setWebsites] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        import("./api/website.js").then(({ getWebsites }) => {
            getWebsites()
                .then(data => setWebsites(data.map(w => ({
                    url: w.URL,
                    domain: "",
                    risk: w.Risk_Score,
                    status: w.Status.toLowerCase(),
                    reports: 0,
                    updated: "",
                }))))
                .catch(() => { })
                .finally(() => setLoading(false));
        });
    }, []);

    const filters = [
        { id: "all", label: "全部", count: websites.length },
        { id: "safe", label: "安全", count: websites.filter((w) => w.status === "safe").length },
        { id: "warn", label: "可疑", count: websites.filter((w) => w.status === "warn").length },
        { id: "danger", label: "高風險", count: websites.filter((w) => w.status === "danger").length },
        { id: "confirmed", label: "已確認為詐騙", count: websites.filter((w) => w.status === "confirmed").length },
    ];

    const rows = websites
        .filter((w) => filter === "all" || w.status === filter)
        .filter((w) => !q || w.url.includes(q) || w.domain.includes(q));

    return (
        <div className="content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">網址總覽</h1>
                    <p className="page-sub">查詢所有已被系統審核過的網址 · 共 {websites.length.toLocaleString()} 筆</p>
                </div>
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-body" style={{ padding: 16 }}>
                    <div className="row" style={{ gap: 12, marginBottom: 14 }}>
                        <div className="search-box" style={{ width: "100%", margin: 0, background: "var(--bg-soft)" }}>
                            {I.search}
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="輸入網址、關鍵字或類型搜尋…" />
                        </div>
                    </div>
                    <div className="chips">
                        {filters.map((f) => (
                            <button key={f.id} className={"chip" + (filter === f.id ? " active" : "")} onClick={() => setFilter(f.id)}>
                                {f.label}<span className="count num">{f.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="card">
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{ width: "40%" }}>網址</th>
                            <th style={{ width: 100 }}>狀態</th>
                            <th style={{ width: 170 }}>風險分數</th>
                            <th style={{ width: 90 }}>被舉報</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--text-3)" }}>載入中…</td></tr>
                        ) : rows.map((w) => (
                            <tr key={w.url}>
                                <td className="url-cell">{w.url}<small>{w.domain}</small></td>
                                <td><StatusBadge status={w.status} /></td>
                                <td>
                                    <div className="row" style={{ gap: 10 }}>
                                        <div style={{ flex: 1, height: 6, background: "var(--bg-tint)", borderRadius: 20, overflow: "hidden" }}>
                                            <div style={{ width: w.risk + "%", height: "100%", background: riskColor(w.risk), borderRadius: 20 }}></div>
                                        </div>
                                        <span className="num" style={{ fontSize: 13, fontWeight: 600, color: riskColor(w.risk), minWidth: 24 }}>{w.risk}</span>
                                    </div>
                                </td>
                                <td className="num">{w.reports.toLocaleString()}</td>
                            </tr>
                        ))}
                        {!loading && rows.length === 0 && (
                            <tr><td colSpan={4}><div className="empty"><div className="ic">{I.search}</div>沒有符合條件的網址</div></td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
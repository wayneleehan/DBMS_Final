import React from "react";

import { MOCK, riskColor } from "./data.jsx";

import {
  I,
  StatusBadge,
  CaseBadge,
} from "./components.jsx";
// LOGIN PAGE — sketch-based: dark top band + centered card
const DEMO_ACCOUNTS = {
  user: [
  { email: "zhian.chen@example.com", password: "demo1234" },
  { email: "test@user.com", password: "demo1234" }],

  admin: [
  { email: "lihong.wang@example.com", password: "admin1234" },
  { email: "admin@antifraud.gov", password: "admin1234" }]

};

export function LoginPage({ onLogin }) {
  const [role, setRole] = React.useState("user");
  const [email, setEmail] = React.useState("zhian.chen@example.com");
  const [pwd, setPwd] = React.useState("demo1234");
  const [remember, setRemember] = React.useState(true);
  const [err, setErr] = React.useState(null);
  const [modal, setModal] = React.useState(null); // "register" | "forgot" | null

  React.useEffect(() => {
    setEmail(role === "admin" ? "lihong.wang@example.com" : "zhian.chen@example.com");
    setPwd(role === "admin" ? "admin1234" : "demo1234");
    setErr(null);
  }, [role]);

  function tryLogin() {
    setErr(null);
    const match = DEMO_ACCOUNTS[role].find((a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === pwd);
    if (!match) {
      setErr("帳號或密碼錯誤，請確認後重新輸入");
      return;
    }
    onLogin(role);
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
              <input value={email} onChange={(e) => {setEmail(e.target.value);setErr(null);}} placeholder="you@example.com" />
            </div>
          </div>

          <div className="field">
            <label>密碼</label>
            <div className="input-prefix">
              <span className="pfx">{I.lock}</span>
              <input type="password" value={pwd} onChange={(e) => {setPwd(e.target.value);setErr(null);}} placeholder="••••••••" />
            </div>
          </div>

          {err &&
          <div style={{
            padding: "10px 12px", borderRadius: 8,
            background: "var(--danger-bg)", border: "1px solid #FECACA",
            color: "#B91C1C", fontSize: 12.5, marginBottom: 12,
            display: "flex", alignItems: "center", gap: 8
          }}>
              {I.warn}<span>{err}</span>
            </div>
          }

          <div className="login-extras">
            <label><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> 記住我</label>
          </div>

          <button className="btn primary block" onClick={tryLogin} style={{ justifyContent: "center", padding: "10px 16px", fontSize: 14 }}>
            登入
          </button>

          <div className="login-foot" style={{ marginTop: 20 }}>
            {role === "admin" ?
              <span style={{ color: "var(--text-3)" }}>管理員帳號由系統管理者建立，無法自行註冊</span> :
              <React.Fragment>還沒有帳號？<a href="#" onClick={(e) => {e.preventDefault();setModal("register");}}>立即註冊</a></React.Fragment>
            }
          </div>
        </div>
      </div>

      <div className="login-foot-bar">v3.2.0 · © 2026 AntiFraud Initiative</div>

      {modal === "register" && <RegisterModal onClose={() => setModal(null)} onDone={() => { setModal(null); setErr(null); }} />}
      {modal === "forgot" && <ForgotPasswordModal onClose={() => setModal(null)} defaultEmail={email} />}
    </div>);

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
    </div>);
}

function RegisterModal({ onClose, onDone }) {
  const [step, setStep] = React.useState("form"); // form | done
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pwd, setPwd] = React.useState("");
  const [pwd2, setPwd2] = React.useState("");
  const [err, setErr] = React.useState({});

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

  function submit() {
    const e = {};
    if (!name.trim()) e.name = "請輸入顯示名稱";
    if (!EMAIL_RE.test(email.trim())) e.email = "Email 格式不正確";
    if (pwd.length < 8) e.pwd = "密碼至少 8 個字元";
    if (pwd !== pwd2) e.pwd2 = "兩次輸入的密碼不一致";
    setErr(e);
    if (Object.keys(e).length === 0) setStep("done");
  }

  if (step === "done") {
    return (
      <Modal title="註冊申請已送出" subtitle="請至 Email 完成驗證後即可登入" stamp="REG · ACK-2026-0517" onClose={onDone}
        footer={<button className="btn primary" onClick={onDone} style={{ padding: "10px 18px" }}>知道了</button>}>
        <div style={{
          padding: "20px", borderRadius: 10, background: "var(--orange-light)",
          border: "1px solid var(--orange-soft)", display: "flex", gap: 14, alignItems: "flex-start"
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: "#fff",
            display: "grid", placeItems: "center", color: "var(--orange)", flexShrink: 0
          }}>{I.check}</div>
          <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-2)" }}>
            驗證信已寄至 <span className="mono" style={{ color: "var(--text)", fontWeight: 500 }}>{email}</span>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-3)" }}>
              驗證連結 24 小時內有效。若未收到，請至垃圾信件夾查看。
            </div>
          </div>
        </div>
        <ul style={{ margin: "16px 0 4px", padding: "0 0 0 18px", fontSize: 12.5, color: "var(--text-3)", lineHeight: 1.8 }}>
          <li>新帳號預設信譽積分為 <strong style={{ color: "var(--text-2)" }}>500</strong></li>
          <li>首次通報前，建議先閱讀社群準則</li>
          <li>連續駁回率過高將觸發人工審核</li>
        </ul>
      </Modal>);
  }

  return (
    <Modal title="建立帳號" subtitle="加入 AntiFraud · 一同回報可疑網站，建立更安全的網路環境" stamp="REG · NEW USER" onClose={onClose}
      footer={
        <React.Fragment>
          <button className="btn ghost" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={submit} style={{ padding: "10px 18px" }}>建立帳號</button>
        </React.Fragment>}>

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
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i < pwdScore ? pwdColors[pwdScore - 1] : "var(--bg-tint)",
                transition: "background .15s"
              }}></div>
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
    </Modal>);
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
        <div style={{
          padding: "20px", borderRadius: 10, background: "var(--bg-soft)",
          border: "1px solid var(--border)", display: "flex", gap: 14, alignItems: "flex-start"
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: "#fff",
            border: "1px solid var(--border)",
            display: "grid", placeItems: "center", color: "var(--orange)", flexShrink: 0
          }}>{I.mail}</div>
          <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-2)" }}>
            已寄送至 <span className="mono" style={{ color: "var(--text)", fontWeight: 500 }}>{email}</span>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-3)" }}>
              基於安全考量，無論該 Email 是否註冊過，皆會顯示此訊息。
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
          沒收到信？<a href="#" onClick={(e) => { e.preventDefault(); setSent(false); }} style={{ color: "var(--orange)", textDecoration: "none", fontWeight: 500 }}>重新寄送</a>
        </div>
      </Modal>);
  }

  return (
    <Modal title="重設密碼" subtitle="輸入註冊時使用的 Email，我們會寄送重設連結" stamp="PWD · RECOVERY" onClose={onClose}
      footer={
        <React.Fragment>
          <button className="btn ghost" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={submit} style={{ padding: "10px 18px" }}>寄送重設連結</button>
        </React.Fragment>}>

      <div className="field" style={{ marginBottom: 6 }}>
        <label>Email</label>
        <div className="input-prefix" style={err ? { borderColor: "var(--danger)" } : {}}>
          <span className="pfx">{I.mail}</span>
          <input value={email} onChange={(e) => { setEmail(e.target.value); setErr(null); }} placeholder="you@example.com" autoFocus />
        </div>
        {err ? <div className="err">{I.warn}{err}</div> : <div className="hint">重設連結 30 分鐘內有效</div>}
      </div>

      <div style={{
        marginTop: 18, padding: "12px 14px", borderRadius: 8,
        background: "var(--bg-soft)", border: "1px dashed var(--border)",
        fontSize: 11.5, color: "var(--text-3)", lineHeight: 1.65
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6 }}>
          {I.shield}帳號安全提示
        </div>
        若你並未提出重設請求，請忽略我們寄出的信件，或聯絡 <span className="mono" style={{ color: "var(--text-2)" }}>support@antifraud.gov</span>。
      </div>
    </Modal>);
}

// ===== USER: PROFILE =====
export function UserProfile() {
  const u = MOCK.user;
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

      {/* Stat row — reputation + 3 metrics */}
      <div className="grid cols-4" style={{ marginBottom: 20 }}>
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
          <div><h3>通報紀錄</h3><div className="sub">最近 6 筆 · 共 {u.stats.total} 筆</div></div>
          <div className="row">
            <button className="btn ghost sm">查看全部</button>
          </div>
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
            {MOCK.records.map((r) =>
            <tr key={r.id}>
                <td className="mono" style={{ fontSize: 12 }}>{r.id}</td>
                <td className="url-cell">{r.url}</td>
                <td>{r.type === "舉報" ? <span className="badge muted">{r.type}</span> : <span className="badge info"><span className="dot"></span>{r.type}</span>}</td>
                <td><CaseBadge status={r.status} /></td>
                <td>{r.verdict ? <StatusBadge status={r.verdict} /> : <span style={{ color: "var(--text-4)" }}>—</span>}</td>
                <td className="num" style={{ fontSize: 12, color: "var(--text-3)" }}>{r.time}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>);

}

// ===== USER: REPORT (with tabs) =====
export function UserReport() {
  const [tab, setTab] = React.useState("report");
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">通報</h1>
          <p className="page-sub">幫助系統更安全 · 你的每一筆通報都會被審核</p>
        </div>
      </div>

      <div className="tabs">
        <button className={"tab" + (tab === "report" ? " active" : "")} onClick={() => {setTab("report");setSubmitted(false);}}>
          舉報 <span className="tab-badge">未審核</span>
        </button>
        <button className={"tab" + (tab === "appeal" ? " active" : "")} onClick={() => {setTab("appeal");setSubmitted(false);}}>
          申訴 <span className="tab-badge">已有結果</span>
        </button>
      </div>

      {submitted ? <SubmittedCard onBack={() => setSubmitted(false)} type={tab} /> :
      tab === "report" ? <ReportForm onSubmit={() => setSubmitted(true)} /> : <AppealForm onSubmit={() => setSubmitted(true)} />}
    </div>);

}

function SubmittedCard({ onBack, type }) {
  return (
    <div className="card" style={{ maxWidth: 680, margin: "32px auto", textAlign: "center" }}>
      <div className="card-body" style={{ padding: "48px 24px" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--orange-light)", display: "grid", placeItems: "center", margin: "0 auto 16px", color: "var(--orange)" }}>
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>{type === "report" ? "舉報" : "申訴"}已送出</h2>
        <p style={{ color: "var(--text-3)", fontSize: 14, margin: "0 0 4px" }}>案件編號 <span className="mono">R-2026-0458</span></p>
        <p style={{ color: "var(--text-3)", fontSize: 14, margin: "0 0 24px" }}>我們將在 24 小時內回覆審核結果</p>
        <div className="row" style={{ justifyContent: "center", gap: 10 }}>
          <button className="btn ghost" onClick={onBack}>返回填寫</button>
          <button className="btn primary">前往紀錄查看</button>
        </div>
      </div>
    </div>);

}

function ReportForm({ onSubmit }) {
  const [url, setUrl] = React.useState("");
  const [cat, setCat] = React.useState("假冒官方網站");
  const [reason, setReason] = React.useState("");
  const [files, setFiles] = React.useState([]);
  const [urlErr, setUrlErr] = React.useState(null);
  const cats = ["假冒官方網站", "釣魚網站", "投資詐騙", "購物詐騙", "其他"];

  // URL validation: domain.tld with optional path, no spaces
  const URL_RE = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(\/[^\s]*)?$/i;
  const urlValid = URL_RE.test(url.trim());
  const ok = urlValid;

  function handleUrl(v) {
    setUrl(v);
    if (!v.trim()) {setUrlErr(null);return;}
    if (!URL_RE.test(v.trim())) setUrlErr("網址格式不正確 · 例：example.com 或 example.com/path");else
    setUrlErr(null);
  }

  function submit() {
    if (!urlValid) {setUrlErr("請輸入正確的網址格式");return;}
    onSubmit();
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
            {cats.map((c) =>
            <button key={c} className={"chip" + (cat === c ? " active" : "")} onClick={() => setCat(c)}>{c}</button>
            )}
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
      <div className="card-foot">
        <button className="btn ghost">儲存草稿</button>
        <button className={"btn primary"} disabled={!ok} onClick={submit} style={{ opacity: ok ? 1 : .5 }}>送出舉報</button>
      </div>
    </div>);

}

function AppealForm({ onSubmit }) {
  const [url, setUrl] = React.useState("shopee-promo-2024.com");
  const [reason, setReason] = React.useState("");
  const [files, setFiles] = React.useState([]);

  return (
    <div className="card" style={{ maxWidth: 820 }}>
      <div className="card-h"><h3>申訴審核結果</h3><span className="sub">對既有判定結果有異議</span></div>
      <div className="card-body">
        <div className="field">
          <label>網址</label>
          <div className="input-prefix">
            <span className="pfx">https://</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
        </div>

        {/* current verdict box */}
        <div className="field">
          <label>目前判定結果</label>
          <div style={{ border: "1px solid var(--border)", background: "var(--bg-soft)", borderRadius: 10, padding: 16 }}>
            <div className="row between" style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: "var(--text-3)" }}>系統判定</span>
              <StatusBadge status="warn" />
            </div>
            <div className="row" style={{ gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>風險分數</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 600, color: "var(--warn)" }}>72</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>類型</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>釣魚網站</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>最後審核</div>
                <div className="num" style={{ fontSize: 13 }}>2026-05-09 09:11</div>
              </div>
            </div>
          </div>
        </div>

        {/* combined reason + evidence */}
        <div className="field">
          <label>申訴原因與補充證據</label>
          <textarea className="textarea" rows="5" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="請說明為何判定結果有誤，並提供支持你論點的事實。"></textarea>
          <div style={{ marginTop: 10 }}>
            <DropZone files={files} setFiles={setFiles} />
          </div>
          <div className="hint">原因與證據皆為選填 · 補充說明可加快複核速度</div>
        </div>

      </div>
      <div className="card-foot">
        <button className="btn ghost">取消</button>
        <button className="btn primary" onClick={onSubmit}>送出申訴</button>
      </div>
    </div>);

}

function DropZone({ files, setFiles }) {
  const [drag, setDrag] = React.useState(false);
  return (
    <div
      onDragOver={(e) => {e.preventDefault();setDrag(true);}}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {e.preventDefault();setDrag(false);setFiles([...files, ...Array.from(e.dataTransfer.files).map((f) => f.name)]);}}
      style={{
        border: "1.5px dashed " + (drag ? "var(--orange)" : "var(--border-strong)"),
        background: drag ? "var(--orange-light)" : "var(--bg-soft)",
        borderRadius: 10, padding: "22px 16px", textAlign: "center",
        color: "var(--text-3)", fontSize: 13, transition: "all .15s"
      }}>
      <div style={{ display: "grid", placeItems: "center", margin: "0 auto 8px", width: 36, height: 36, borderRadius: 8, background: "#fff", border: "1px solid var(--border)", color: "var(--text-2)" }}>{I.upload}</div>
      <div>拖曳檔案到此 · 或 <span style={{ color: "var(--orange)", fontWeight: 500, cursor: "pointer" }}>點此選擇</span></div>
      {files.length > 0 &&
      <div className="row" style={{ gap: 6, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {files.map((f, i) => <span key={i} className="muted-tag">{f}</span>)}
        </div>
      }
    </div>);

}

// ===== USER: WEBSITE OVERVIEW =====
export function WebsiteOverview() {
  const [filter, setFilter] = React.useState("all");
  const [q, setQ] = React.useState("");
  const filters = [
  { id: "all", label: "全部", count: MOCK.websites.length },
  { id: "safe", label: "安全", count: MOCK.websites.filter((w) => w.status === "safe").length },
  { id: "warn", label: "可疑", count: MOCK.websites.filter((w) => w.status === "warn").length },
  { id: "danger", label: "高風險", count: MOCK.websites.filter((w) => w.status === "danger").length },
  { id: "confirmed", label: "已確認為詐騙", count: MOCK.websites.filter((w) => w.status === "confirmed").length }];

  const rows = MOCK.websites.
  filter((w) => filter === "all" || w.status === filter).
  filter((w) => !q || w.url.includes(q) || w.domain.includes(q));

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">網址總覽</h1>
          <p className="page-sub">查詢所有已被系統審核過的網址 · 共 {MOCK.websites.length.toLocaleString()} 筆</p>
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
            {filters.map((f) =>
            <button key={f.id} className={"chip" + (filter === f.id ? " active" : "")} onClick={() => setFilter(f.id)}>
                {f.label}<span className="count num">{f.count}</span>
              </button>
            )}
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
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) =>
            <tr key={w.url}>
                <td className="url-cell">
                  {w.url}
                  <small>{w.domain}</small>
                </td>
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
                <td><button className="btn ghost sm">詳情{I.chevron}</button></td>
              </tr>
            )}
            {rows.length === 0 &&
            <tr><td colSpan="5"><div className="empty"><div className="ic">{I.search}</div>沒有符合條件的網址</div></td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>);

}

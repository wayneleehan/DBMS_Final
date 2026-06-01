import React from "react";
import { MOCK } from "./data.jsx";
import { API } from "./api/index.js";
import { I, Stat, CaseBadge, RiskRing, StatusBadge } from "./components.jsx";
import { normalizeWebsiteStatus } from "./status.js";
import { isHttpUrl, openHttpUrl } from "./url.js";

// ===== ADMIN: REVIEW PAGE =====
export function AdminReview({ onOpen }) {
  // filter:'all' / '待審核' / '申訴中' / '已通過' / '已駁回'
  // 後端目前只有「待審核 / 申訴中」兩種有資料,其他兩個會 hardcode 0(等之後做歷史紀錄 API)
  const [filter, setFilter] = React.useState("all");
  const [rows, setRows] = React.useState([]);
  const [counts, setCounts] = React.useState({ pending: 0, appealing: 0 });
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState(null);

  // 載入清單 + 計數;filter 改變要重抓清單
  React.useEffect(() => {
    setLoading(true);
    setErr(null);
    const statusParam = (filter === "all") ? null : filter;
    Promise.all([
      API.getReviewQueue(statusParam),
      API.getReviewQueueCounts(),
    ])
      .then(([queue, c]) => { setRows(queue); setCounts(c); })
      .catch((e) => setErr(e.message || "載入失敗"))
      .finally(() => setLoading(false));
  }, [filter]);

  const filters = [
    { id: "all", label: "全部", count: counts.pending + counts.appealing },
    { id: "待審核", label: "待審核", count: counts.pending },
    { id: "申訴中", label: "申訴中", count: counts.appealing },
    { id: "已通過", label: "已通過", count: 0 },
    { id: "已駁回", label: "已駁回", count: 0 },
  ];

  // 把後端 row 轉成 ReviewDetail 期待的 caseData 形狀
  function rowToCase(r) {
    return {
      id: r.case_id,
      raw_id: r.raw_id,
      type: r.type,
      cat: r.category || "—",
      status: r.case_status,
      url: r.url,
      risk: Math.round(r.risk_score),
      submitter: r.submitter_name,
      submitter_id: r.submitter_id,
      reputation: Math.round(r.submitter_reputation || 0),
      time: r.submitted_at ? r.submitted_at.replace("T", " ").slice(0, 16) : "—",
      reason: r.reason,
      website_status: r.website_status,
      evidence: Array.isArray(r.evidence_urls) ? r.evidence_urls : [],
    };
  }

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">網址審核</h1>
          <p className="page-sub">處理使用者提交的舉報與申訴案件</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge warn"><span className="dot"></span>{counts.pending} 件待審核</span>
          <span className="badge info"><span className="dot"></span>{counts.appealing} 件申訴中</span>
        </div>
      </div>

      {/* mini metrics row — 暫時 hardcode,等做歷史/統計 API */}
      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <Stat icon={I.clock} label="待審核" value={counts.pending} accent />
        <Stat icon={I.bolt} label="申訴中" value={counts.appealing} />
        <Stat icon={I.check} label="今週通過率" value="—" />
        <Stat icon={I.warn} label="協同造假警報" value="—" />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <div className="chips">
            {filters.map(f => (
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
              <th style={{ width: 110 }}>案件編號</th>
              <th>網址</th>
              <th style={{ width: 100 }}>狀態</th>
              <th style={{ width: 90 }}>風險</th>
              <th style={{ width: 130 }}>提交者</th>
              <th style={{ width: 140 }}>提交時間</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-3)" }}>載入中…</td></tr>
            ) : err ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#B91C1C" }}>{err}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-3)" }}>目前佇列空空如也</td></tr>
            ) : rows.map(r => {
              const c = rowToCase(r);
              return (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => onOpen(c)}>
                  <td className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{c.id}</td>
                  <td className="url-cell">{c.url}<small>{c.cat}</small></td>
                  <td><CaseBadge status={c.status} /></td>
                  <td><RiskRing value={c.risk} size={36} /></td>
                  <td>
                    <div style={{ fontSize: 13 }}>{c.submitter}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>信譽 <span className="num">{c.reputation}</span></div>
                  </td>
                  <td className="num" style={{ fontSize: 12, color: "var(--text-3)" }}>{c.time}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== REVIEW DETAIL =====
export function ReviewDetail({ caseData, onBack }) {
  const c = caseData;
  const [verdict, setVerdict] = React.useState(null);
  const [note, setNote] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitErr, setSubmitErr] = React.useState(null);

  // 兩種案件型別分別走不同 API:
  //   申訴(type='申訴'):走 /admin/review,把 verdict 轉成 Approved/Rejected
  //   舉報(type='舉報'):走 /admin/report-verdict,直接送 verdict
  const isAppeal = c.type === "申訴";

  // 申訴 case 的 verdict → decision 映射:
  //   safe → Approved(申訴通過,撤回對網站的負面判定)
  //   warn / danger / reject → Rejected(駁回申訴,維持原判定)
  function verdictToDecision(v) {
    return v === "safe" ? "Approved" : "Rejected";
  }

  async function handleSubmit() {
    setSubmitErr(null);
    if (!verdict) return;
    if (!note.trim()) {
      setSubmitErr("請填寫管理員備註(內部紀錄用)");
      return;
    }
    setSubmitting(true);
    try {
      if (isAppeal) {
        await API.submitReview({
          appeal_id: c.raw_id,
          decision: verdictToDecision(verdict),
          ruling_result: note.trim(),
          is_unreasonable: verdict !== "safe",
        });
      } else {
        // 舉報 case:verdict (safe/warn/danger) 直接送
        // 'reject' 對舉報沒意義,前端 UI 只在 isAppeal 時顯示該按鈕,理論上不會走到
        await API.submitReportVerdict({
          report_id: c.raw_id,
          verdict: verdict,
          note: note.trim(),
        });
      }
      setDone(true);
    } catch (e) {
      if (e.status === 401) setSubmitErr("登入狀態已失效,請重新登入");
      else if (e.status === 403) setSubmitErr("僅限管理員操作");
      else setSubmitErr(e.message || "送出失敗,請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="content">
        <div className="card" style={{ maxWidth: 680, margin: "32px auto", textAlign: "center" }}>
          <div className="card-body" style={{ padding: "48px 24px" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--safe-bg)", display: "grid", placeItems: "center", margin: "0 auto 16px", color: "var(--safe)" }}>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>審核已送出</h2>
            <p style={{ color: "var(--text-3)", fontSize: 14, margin: "0 0 24px" }}>判定：<StatusBadge status={verdict} /> · 案件 {c.id} 已關閉</p>
            <button className="btn primary" onClick={onBack}>返回審核列表</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div style={{ marginBottom: 16 }}>
        <button className="btn ghost sm" onClick={onBack}>
          <span style={{ transform: "rotate(180deg)", display: "inline-flex" }}>{I.chevron}</span> 返回審核列表
        </button>
      </div>

      <div className="page-header" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="row" style={{ gap: 10, marginBottom: 8 }}>
            <span className="muted-tag">{c.id}</span>
            <CaseBadge status={c.status} />
            {c.type === "申訴" && <span className="badge info"><span className="dot"></span>{c.type}</span>}
          </div>
          <h1 className="page-title mono" style={{ fontFamily: "var(--font-mono)", fontSize: 22 }}>{c.url}</h1>
          <p className="page-sub">{c.cat} · 由 <strong>{c.submitter}</strong>（信譽 <span className="num">{c.reputation}</span>）提交於 <span className="num">{c.time}</span></p>
        </div>
        <div className="row">
          <button className="btn ghost sm" onClick={() => openHttpUrl(c.url)}>{I.external} 開啟網址</button>
          <button className="btn ghost sm">指派給其他審核員</button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          {/* URL Info */}
          <div className="card">
            <div className="card-h"><h3>網址資訊</h3></div>
            <div className="card-body">
              <div className="grid cols-4" style={{ gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>風險分數</div>
                  <RiskRing value={c.risk || 88} size={56} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>目前狀態</div>
                  <StatusBadge status={normalizeWebsiteStatus(c.website_status)} />
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>已進入觀察</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>累計舉報</div>
                  <div className="num" style={{ fontSize: 24, fontWeight: 600 }}>218</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>網域註冊</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>3 天前</div>
                  <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>● 新註冊網域</div>
                </div>
              </div>
            </div>
          </div>

          {/* Submitted content */}
          <div className="card">
            <div className="card-h"><h3>使用者提交內容</h3></div>
            <div className="card-body">
              <div className="section-title">舉報理由</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-2)", margin: "0 0 20px" }}>
                {c.reason || "假冒銀行登入頁，UI 與官方相似度極高，要求用戶輸入網銀帳號密碼與 OTP，並以「帳戶異常」為由誘導匯款。"}
              </p>
              <div className="section-title">證據檔案</div>
              <EvidenceGrid files={c.evidence || []} />
            </div>
          </div>

          {/* History */}
          <div className="card">
            <div className="card-h"><h3>歷史紀錄</h3><span className="sub">過往審核與申訴</span></div>
            <div className="card-body">
              <div className="timeline">
                <div className="tl-item orange">
                  <div className="time">2026-05-13 09:14</div>
                  <div className="what">{c.submitter} 提交{c.type}</div>
                  <div className="who">附帶 3 件證據</div>
                </div>
                <div className="tl-item warn">
                  <div className="time">2026-05-10 14:08</div>
                  <div className="what">系統自動標記為「可疑」</div>
                  <div className="who">基於 47 筆使用者舉報</div>
                </div>
                <div className="tl-item">
                  <div className="time">2026-05-08 11:32</div>
                  <div className="what">第一筆舉報送入</div>
                  <div className="who">由 王彥廷（信譽 612）提交</div>
                </div>
                <div className="tl-item">
                  <div className="time">2026-05-05</div>
                  <div className="what">網域註冊</div>
                  <div className="who">註冊國：俄羅斯 · WHOIS 隱匿</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right rail — admin action panel */}
        <div className="card" style={{ position: "sticky", top: 80 }}>
          <div className="card-h"><h3>審核決定</h3></div>
          <div className="card-body">
            <div className="section-title">判定</div>
            <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
              <VerdictButton id="safe" current={verdict} onSelect={setVerdict} label={isAppeal ? "申訴通過(撤回判定)" : "判定為安全"} tone="safe" />
              <VerdictButton id="warn" current={verdict} onSelect={setVerdict} label="判定為可疑" tone="warn" />
              <VerdictButton id="danger" current={verdict} onSelect={setVerdict} label="判定為高風險" tone="danger" />
              {isAppeal && <VerdictButton id="reject" current={verdict} onSelect={setVerdict} label="駁回申訴(維持原判)" tone="muted" />}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>管理員備註 <span style={{ color: "var(--danger)" }}>*</span></label>
              <textarea className="textarea" rows="4" value={note} onChange={e => setNote(e.target.value)}
                placeholder="說明判定理由,內部紀錄用…"></textarea>
            </div>
            {submitErr && (
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "var(--danger-bg)", border: "1px solid #FECACA", color: "#B91C1C", fontSize: 12.5 }}>
                {submitErr}
              </div>
            )}
          </div>
          <div className="card-foot">
            <button className="btn ghost" disabled={submitting} onClick={onBack}>取消</button>
            <button className="btn primary" disabled={!verdict || submitting}
              style={{ opacity: (verdict && !submitting) ? 1 : .5 }} onClick={handleSubmit}>
              {submitting ? "送出中…" : "送出審核結果"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceGrid({ files }) {
  const imageUrls = files.filter(isHttpUrl);

  if (imageUrls.length === 0) {
    return (
      <div className="empty" style={{ padding: 18 }}>
        <div className="ic">{I.upload}</div>
        這筆案件沒有上傳圖片證據
      </div>
    );
  }

  return (
    <div className="grid cols-3" style={{ gap: 10 }}>
      {imageUrls.map((url, i) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="evidence-thumb" title="開啟原始圖片">
          <img src={url} alt={`證據圖片 ${i + 1}`} loading="lazy" />
        </a>
      ))}
    </div>
  );
}

function VerdictButton({ id, current, onSelect, label, tone }) {
  const colors = {
    safe: { bg: "var(--safe-bg)", bd: "#BBF7D0", c: "#15803D" },
    warn: { bg: "var(--warn-bg)", bd: "#FDE68A", c: "#B45309" },
    danger: { bg: "var(--danger-bg)", bd: "#FECACA", c: "#B91C1C" },
    muted: { bg: "var(--bg-tint)", bd: "var(--border)", c: "var(--text-2)" },
  }[tone];
  const active = current === id;
  return (
    <button onClick={() => onSelect(id)} style={{
      textAlign: "left", padding: "10px 14px", borderRadius: 8,
      border: "1.5px solid " + (active ? colors.c : colors.bd),
      background: active ? colors.bg : "#fff",
      color: colors.c, fontWeight: active ? 600 : 500, fontSize: 13.5,
      display: "flex", alignItems: "center", gap: 10, cursor: "pointer"
    }}>
      <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid " + colors.c, display: "grid", placeItems: "center" }}>
        {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.c }}></span>}
      </span>
      {label}
    </button>
  );
}

// ===== ADMIN: ALERT =====
export function AdminAlert() {
  const [alerts, setAlerts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    API.getAlerts()
      .then(setAlerts)
      .catch(e => setErr(e.message || "載入失敗"))
      .finally(() => setLoading(false));
  }, []);

  const TYPE_MAP = {
    CIB_Attack: "協同造假",
    Cluster_Warning: "高比例封鎖 IP",
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">警報系統</h1>
          <p className="page-sub">監控可疑帳號與異常通報行為，即時追蹤誰做了什麼</p>
        </div>
      </div>

      <div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-3)" }}>載入中…</div>
        ) : err ? (
          <div style={{ textAlign: "center", padding: 24, color: "#B91C1C" }}>{err}</div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-3)" }}>目前沒有警報</div>
        ) : alerts.map(a => (
          <div key={a.id} className={`alert-row ${a.type === "CIB_Attack" ? "cib" : "cluster"}`}>
            <div className="sev"></div>
            <div className="body">
              <div className="top">
                <span className="muted-tag">{a.id}</span>
                <span className="badge warn">{TYPE_MAP[a.type] || a.type}</span>
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-3)" }} className="num">{a.time}</span>
              </div>
              <div className="desc">{a.desc}</div>
              <div className="row" style={{ gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>關聯：</span>
                <span className="muted-tag">{a.related}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
// ===== ADMIN: PROFILE =====
export function AdminProfile({ user }) {
  // user 是後端回的 UserInfo;admin 版有 admin_role 但沒 reliability_score。
  // 其他顯示用欄位(stats / history)還沒對應 API,先用 MOCK 補。
  const [history, setHistory] = React.useState([]);
  const [loadingHistory, setLoadingHistory] = React.useState(true);
  const [historyErr, setHistoryErr] = React.useState(null);

  React.useEffect(() => {
    API.getAdminHistory()
      .then(setHistory)
      .catch((e) => setHistoryErr(e.message || "載入審核歷史失敗"))
      .finally(() => setLoadingHistory(false));
  }, []);

  const a = {
    name: user?.name || "—",
    initials: user?.name ? user.name[0] : "?",
    email: user?.email || "",
    role: user?.admin_role || MOCK.admin.role,
    joined: user?.created_at ? user.created_at.slice(0, 10) : "—",
    stats: MOCK.admin.stats,  // TODO: 待後端管理員統計 API 接上
  };
  
  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">管理員個人頁面</h1>
          <p className="page-sub">查看你的審核資料與績效統計</p>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-body">
            <div className="row" style={{ gap: 14 }}>
              <div className="avatar" style={{ width: 52, height: 52, fontSize: 18, background: "linear-gradient(135deg,#1F2937,#111827)" }}>{a.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{a.email}</div>
              </div>
              <div className="row" style={{ gap: 32, alignItems: "flex-start" }}>
                <div><div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>權限角色</div><span className="badge solid-orange"><span className="dot"></span>{a.role}</span></div>
                <div><div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>到職日期</div><div className="num" style={{ fontSize: 13, lineHeight: "22px" }}>{a.joined}</div></div>
                <div><div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>當前狀態</div><StatusBadge status="safe" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div><h3>審核歷史</h3><span className="sub">最近 6 筆紀錄</span></div>
          <button className="btn ghost sm">查看全部</button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 160 }}>審核時間</th>
              <th>網址</th>
              <th style={{ width: 90 }}>案件類型</th>
              <th style={{ width: 120 }}>審核結果</th>
              <th>管理員備註</th>
            </tr>
          </thead>
          <tbody>
            {loadingHistory ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--text-3)" }}>載入中…</td></tr>
            ) : historyErr ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#B91C1C" }}>{historyErr}</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--text-3)" }}>目前沒有審核歷史</td></tr>
            ) : history.map((h, i) => (
              <tr key={i}>
                <td className="num" style={{ fontSize: 12, color: "var(--text-3)" }}>{h.time}</td>
                <td className="url-cell">{h.url}</td>
                <td>{h.type === "舉報" ? <span className="badge muted">{h.type}</span> : <span className="badge info"><span className="dot"></span>{h.type}</span>}</td>
                <td><StatusBadge status={h.verdict} /></td>
                <td style={{ color: h.note ? "var(--text-2)" : "var(--text-4)", fontSize: 13 }}>{h.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

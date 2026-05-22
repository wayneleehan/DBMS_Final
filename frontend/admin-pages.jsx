// ===== ADMIN: REVIEW PAGE =====
function AdminReview({ onOpen }) {
  const [filter, setFilter] = React.useState("all");
  const filters = [
    { id: "all", label: "全部", count: MOCK.reviewQueue.length },
    { id: "待審核", label: "待審核", count: MOCK.reviewQueue.filter(c => c.status === "待審核").length },
    { id: "申訴中", label: "申訴中", count: MOCK.reviewQueue.filter(c => c.status === "申訴中").length },
    { id: "已通過", label: "已通過", count: 0 },
    { id: "已駁回", label: "已駁回", count: 0 },
  ];
  const rows = MOCK.reviewQueue.filter(c => filter === "all" || c.status === filter);

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">網址審核</h1>
          <p className="page-sub">處理使用者提交的舉報與申訴案件</p>
        </div>
        <div className="row" style={{gap:8}}>
          <span className="badge warn"><span className="dot"></span>{MOCK.reviewQueue.filter(c => c.status==="待審核").length} 件待審核</span>
          <span className="badge info"><span className="dot"></span>{MOCK.reviewQueue.filter(c => c.status==="申訴中").length} 件申訴中</span>
        </div>
      </div>

      {/* mini metrics row */}
      <div className="grid cols-4" style={{marginBottom:16}}>
        <Stat icon={I.clock} label="待審核" value="12" accent/>
        <Stat icon={I.bolt} label="今日已處理" value="34"/>
        <Stat icon={I.check} label="今週通過率" value="64" suffix="%"/>
        <Stat icon={I.warn} label="協同造假警報" value="2"/>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:16}}>
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
              <th style={{width:110}}>案件編號</th>
              <th>網址</th>
              <th style={{width:100}}>狀態</th>
              <th style={{width:90}}>風險</th>
              <th style={{width:130}}>提交者</th>
              <th style={{width:140}}>提交時間</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} style={{cursor:"pointer"}} onClick={() => onOpen(c)}>
                <td className="mono" style={{fontSize:12,fontWeight:500}}>{c.id}</td>
                <td className="url-cell">{c.url}<small>{c.cat}</small></td>
                <td><CaseBadge status={c.status}/></td>
                <td>
                  <RiskRing value={c.risk} size={36}/>
                </td>
                <td>
                  <div style={{fontSize:13}}>{c.submitter}</div>
                  <div style={{fontSize:11,color:"var(--text-3)"}}>信譽 <span className="num">{c.reputation}</span></div>
                </td>
                <td className="num" style={{fontSize:12,color:"var(--text-3)"}}>{c.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== REVIEW DETAIL =====
function ReviewDetail({ caseData, onBack }) {
  const c = caseData;
  const [verdict, setVerdict] = React.useState(null);
  const [note, setNote] = React.useState("");
  const [done, setDone] = React.useState(false);

  if (done) {
    return (
      <div className="content">
        <div className="card" style={{maxWidth:680,margin:"32px auto",textAlign:"center"}}>
          <div className="card-body" style={{padding:"48px 24px"}}>
            <div style={{width:72,height:72,borderRadius:"50%",background:"var(--safe-bg)",display:"grid",placeItems:"center",margin:"0 auto 16px",color:"var(--safe)"}}>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>
            </div>
            <h2 style={{margin:"0 0 8px",fontSize:22}}>審核已送出</h2>
            <p style={{color:"var(--text-3)",fontSize:14,margin:"0 0 24px"}}>判定：<StatusBadge status={verdict}/> · 案件 {c.id} 已關閉</p>
            <button className="btn primary" onClick={onBack}>返回審核列表</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div style={{marginBottom:16}}>
        <button className="btn ghost sm" onClick={onBack}>
          <span style={{transform:"rotate(180deg)",display:"inline-flex"}}>{I.chevron}</span> 返回審核列表
        </button>
      </div>

      <div className="page-header" style={{alignItems:"flex-start"}}>
        <div>
          <div className="row" style={{gap:10,marginBottom:8}}>
            <span className="muted-tag">{c.id}</span>
            <CaseBadge status={c.status}/>
            {c.type === "申訴" && <span className="badge info"><span className="dot"></span>{c.type}</span>}
          </div>
          <h1 className="page-title mono" style={{fontFamily:"var(--font-mono)",fontSize:22}}>{c.url}</h1>
          <p className="page-sub">{c.cat} · 由 <strong>{c.submitter}</strong>（信譽 <span className="num">{c.reputation}</span>）提交於 <span className="num">{c.time}</span></p>
        </div>
        <div className="row">
          <button className="btn ghost sm">{I.external} 開啟網址</button>
          <button className="btn ghost sm">指派給其他審核員</button>
        </div>
      </div>

      <div className="grid" style={{gridTemplateColumns:"1fr 360px",gap:20,alignItems:"flex-start"}}>
        <div style={{display:"grid",gap:16}}>
          {/* URL Info */}
          <div className="card">
            <div className="card-h"><h3>網址資訊</h3></div>
            <div className="card-body">
              <div className="grid cols-4" style={{gap:14}}>
                <div>
                  <div style={{fontSize:11,color:"var(--text-3)",marginBottom:6}}>風險分數</div>
                  <RiskRing value={c.risk || 88} size={56}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--text-3)",marginBottom:6}}>目前狀態</div>
                  <StatusBadge status="warn"/>
                  <div style={{fontSize:11,color:"var(--text-3)",marginTop:6}}>已進入觀察</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--text-3)",marginBottom:6}}>累計舉報</div>
                  <div className="num" style={{fontSize:24,fontWeight:600}}>218</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--text-3)",marginBottom:6}}>網域註冊</div>
                  <div style={{fontSize:14,fontWeight:500}}>3 天前</div>
                  <div style={{fontSize:11,color:"var(--danger)",marginTop:2}}>● 新註冊網域</div>
                </div>
              </div>
            </div>
          </div>

          {/* Submitted content */}
          <div className="card">
            <div className="card-h"><h3>使用者提交內容</h3></div>
            <div className="card-body">
              <div className="section-title">舉報理由</div>
              <p style={{fontSize:14,lineHeight:1.7,color:"var(--text-2)",margin:"0 0 20px"}}>
                {c.reason || "假冒銀行登入頁，UI 與官方相似度極高，要求用戶輸入網銀帳號密碼與 OTP，並以「帳戶異常」為由誘導匯款。"}
              </p>

              <div className="section-title">證據檔案</div>
              <div className="grid cols-3" style={{gap:10}}>
                {(c.evidence || ["screenshot-01.png","screenshot-02.png","evidence.txt"]).map((f,i) => (
                  <div key={i} className="placeholder-img" style={{height:120}}>
                    [{f}]
                  </div>
                ))}
              </div>
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
        <div className="card" style={{position:"sticky",top:80}}>
          <div className="card-h"><h3>審核決定</h3></div>
          <div className="card-body">
            <div className="section-title">判定</div>
            <div style={{display:"grid",gap:8,marginBottom:18}}>
              <VerdictButton id="safe" current={verdict} onSelect={setVerdict} label="判定為安全" tone="safe"/>
              <VerdictButton id="warn" current={verdict} onSelect={setVerdict} label="判定為可疑" tone="warn"/>
              <VerdictButton id="danger" current={verdict} onSelect={setVerdict} label="判定為高風險" tone="danger"/>
              {c.type === "申訴" && <VerdictButton id="reject" current={verdict} onSelect={setVerdict} label="駁回申訴" tone="muted"/>}
            </div>

            <div className="field" style={{marginBottom:0}}>
              <label>管理員備註</label>
              <textarea className="textarea" rows="4" value={note} onChange={e => setNote(e.target.value)}
                placeholder="說明判定理由，內部紀錄用…"></textarea>
            </div>
          </div>
          <div className="card-foot">
            <button className="btn ghost">取消</button>
            <button className="btn primary" disabled={!verdict} style={{opacity:verdict?1:.5}} onClick={() => setDone(true)}>送出審核結果</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerdictButton({ id, current, onSelect, label, tone }) {
  const colors = {
    safe:   { bg: "var(--safe-bg)", bd: "#BBF7D0", c: "#15803D" },
    warn:   { bg: "var(--warn-bg)", bd: "#FDE68A", c: "#B45309" },
    danger: { bg: "var(--danger-bg)", bd: "#FECACA", c: "#B91C1C" },
    muted:  { bg: "var(--bg-tint)", bd: "var(--border)", c: "var(--text-2)" },
  }[tone];
  const active = current === id;
  return (
    <button
      onClick={() => onSelect(id)}
      style={{
        textAlign:"left", padding:"10px 14px", borderRadius:8,
        border: "1.5px solid " + (active ? colors.c : colors.bd),
        background: active ? colors.bg : "#fff",
        color: colors.c, fontWeight: active ? 600 : 500, fontSize: 13.5,
        display:"flex", alignItems:"center", gap:10, cursor:"pointer"
      }}>
      <span style={{width:14,height:14,borderRadius:"50%",border:"2px solid " + colors.c, display:"grid",placeItems:"center"}}>
        {active && <span style={{width:6,height:6,borderRadius:"50%",background:colors.c}}></span>}
      </span>
      {label}
    </button>
  );
}

// ===== ADMIN: ALERT =====
function AdminAlert() {
  const [sev, setSev] = React.useState("all");
  const sevFilters = [
    { id:"all", label:"全部", count: MOCK.alerts.length },
    { id:"大量資料湧入", label:"大量資料湧入", count: MOCK.alerts.filter(a=>a.type==="大量資料湧入").length },
    { id:"協同造假", label:"協同造假", count: MOCK.alerts.filter(a=>a.type==="協同造假").length },
    { id:"高比例封鎖 IP", label:"高比例封鎖 IP", count: MOCK.alerts.filter(a=>a.type==="高比例封鎖 IP").length },
  ];
  const list = MOCK.alerts.filter(a => sev === "all" || a.type === sev);

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">警報系統</h1>
          <p className="page-sub">監控可疑帳號與異常通報行為，即時追蹤誰做了什麼</p>
        </div>
        <div className="row">
          <span className="badge danger" style={{padding:"4px 10px"}}><span className="dot" style={{animation:"pulse 1.4s infinite"}}></span>2 件嚴重警報</span>
        </div>
      </div>

      <div className="grid cols-4" style={{marginBottom:16}}>
        <Stat icon={I.warn} label="總警報數" value="247"/>
        <Stat icon={I.bolt} label="嚴重警報" value="2" accent/>
        <Stat icon={I.clock} label="待處理" value="14"/>
        <Stat icon={I.check} label="本週已處理" value="68"/>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:16}}>
          <div className="chips">
            {sevFilters.map(f => (
              <button key={f.id} className={"chip" + (sev === f.id ? " active" : "")} onClick={() => setSev(f.id)}>
                {f.label}<span className="count num">{f.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        {list.map(a => (
          <div key={a.id} className={"alert-row " + a.severity}>
            <div className="sev"></div>
            <div className="body">
              <div className="top">
                <span className="muted-tag">{a.id}</span>
                <SeverityTag sev={a.severity}/>
                <span className="badge muted">{a.type}</span>
                <span style={{marginLeft:"auto",fontSize:11.5,color:"var(--text-3)"}} className="num">{a.time}</span>
              </div>
              <div className="title">{a.title}</div>
              <div className="desc">{a.desc}</div>
              <div className="row" style={{gap:8,marginTop:4}}>
                <span style={{fontSize:11,color:"var(--text-3)"}}>關聯：</span>
                <span className="muted-tag">{a.related}</span>
              </div>
            </div>
            <div className="actions">
              <button className="btn ghost sm">查看詳情</button>
              <button className="btn primary sm">標記已處理</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeverityTag({ sev }) {
  const m = {
    critical: { label: "嚴重", cls: "danger" },
    high:     { label: "高",   cls: "warn" },
    medium:   { label: "中",   cls: "info" },
    low:      { label: "低",   cls: "muted" },
  }[sev];
  return <span className={"badge " + m.cls}><span className="dot"></span>{m.label}</span>;
}

// ===== ADMIN: PROFILE =====
function AdminProfile({ user }) {
  // user 是後端回的 UserInfo;admin 版有 admin_role 但沒 reliability_score。
  // 其他顯示用欄位(stats / history)還沒對應 API,先用 MOCK 補。
  const a = {
    name: user?.name || "—",
    initials: user?.name ? user.name[0] : "?",
    email: user?.email || "",
    role: user?.admin_role || MOCK.admin.role,
    joined: user?.created_at ? user.created_at.slice(0, 10) : "—",
    stats: MOCK.admin.stats,  // TODO: 待後端管理員統計 API 接上
  };
  const history = [
    { time: "2026-05-13 10:42", url: "fastmart-deal.shop", type: "舉報", verdict: "warn", note: "新註冊網域，已標記觀察" },
    { time: "2026-05-13 09:30", url: "line-pay-rewards.app", type: "舉報", verdict: "warn", note: "" },
    { time: "2026-05-13 08:14", url: "twcrypto-invest.io", type: "舉報", verdict: "danger", note: "高度仿冒，建議立即封鎖" },
    { time: "2026-05-12 19:55", url: "udn-news-tw.cc", type: "舉報", verdict: "danger", note: "假冒新聞網站投放廣告" },
    { time: "2026-05-12 17:20", url: "shopee-promo-2024.com", type: "申訴", verdict: "warn", note: "申訴駁回，維持原判定" },
    { time: "2026-05-12 14:05", url: "easycard-tw.gov.tw", type: "申訴", verdict: "safe", note: "確認為官方網址" },
  ];

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">管理員個人頁面</h1>
          <p className="page-sub">查看你的審核資料與績效統計</p>
        </div>
      </div>

      <div style={{marginBottom:16}}>
        <div className="card">
          <div className="card-body">
            <div className="row" style={{gap:14}}>
              <div className="avatar" style={{width:52,height:52,fontSize:18,background:"linear-gradient(135deg,#1F2937,#111827)"}}>{a.initials}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontWeight:600}}>{a.name}</div>
                <div style={{fontSize:12,color:"var(--text-3)",marginTop:2}}>{a.email}</div>
              </div>
              <div className="row" style={{gap:32,alignItems:"flex-start"}}>
                <div><div style={{fontSize:11,color:"var(--text-3)",marginBottom:6}}>權限角色</div><span className="badge solid-orange"><span className="dot"></span>{a.role}</span></div>
                <div><div style={{fontSize:11,color:"var(--text-3)",marginBottom:6}}>到職日期</div><div className="num" style={{fontSize:13,lineHeight:"22px"}}>{a.joined}</div></div>
                <div><div style={{fontSize:11,color:"var(--text-3)",marginBottom:6}}>當前狀態</div><StatusBadge status="safe"/></div>
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
              <th style={{width:160}}>審核時間</th>
              <th>網址</th>
              <th style={{width:90}}>案件類型</th>
              <th style={{width:120}}>審核結果</th>
              <th>管理員備註</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i}>
                <td className="num" style={{fontSize:12,color:"var(--text-3)"}}>{h.time}</td>
                <td className="url-cell">{h.url}</td>
                <td>{h.type === "舉報" ? <span className="badge muted">{h.type}</span> : <span className="badge info"><span className="dot"></span>{h.type}</span>}</td>
                <td><StatusBadge status={h.verdict}/></td>
                <td style={{color: h.note ? "var(--text-2)" : "var(--text-4)",fontSize:13}}>{h.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { AdminReview, ReviewDetail, AdminAlert, AdminProfile });

const STATUS_META = {
  Blocked:  { className: "blocked",  label: "BLOCKED",  desc: "已知詐騙網站" },
  Warning:  { className: "warning",  label: "WARNING",  desc: "高風險網站" },
  Low_Risk: { className: "low-risk", label: "LOW RISK", desc: "待觀察" },
  Safe:     { className: "safe",     label: "SAFE",     desc: "安全" },
};

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function render(data) {
  const root = document.getElementById("root");

  if (!data) {
    root.innerHTML = `
      <div class="empty">
        尚未檢測此分頁。<br>
        重新整理頁面或前往新網址後再開啟。
      </div>`;
    return;
  }

  const meta = STATUS_META[data.status] ?? {
    className: "unknown", label: data.status ?? "UNKNOWN", desc: "",
  };
  const tag = data.is_new ? "新網址" : "已知網址";

  root.innerHTML = `
    <div class="card">
      <div class="header">本頁安全狀態</div>
      <div class="status-row ${meta.className}">
        <div class="dot"></div>
        <div>
          <div class="status-label">${escapeHtml(meta.label)}</div>
        </div>
      </div>
      <div class="url">${escapeHtml(data.url ?? "")}</div>
      <div class="row">
        <span class="key">風險分數</span>
        <span class="val score ${meta.className}">${escapeHtml(data.risk_score)}</span>
      </div>
      <div class="row">
        <span class="key">說明</span>
        <span class="val">${escapeHtml(meta.desc)}</span>
      </div>
      <div class="row">
        <span class="key">類型</span>
        <span class="val">${escapeHtml(tag)}</span>
      </div>
      ${data.ip ? `
      <div class="row">
        <span class="key">IP</span>
        <span class="val">${escapeHtml(data.ip)}</span>
      </div>` : ""}
    </div>`;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    render(null);
    return;
  }
  const key = `tab:${tab.id}`;
  const obj = await chrome.storage.session.get(key);
  render(obj[key] ?? null);
}

init();

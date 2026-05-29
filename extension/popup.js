const STATUS_META = {
  Blocked:  {
    className: "blocked",
    label: "BLOCKED",
    desc: "已知詐騙網站",
    dot: "#C0392B",
    icon: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>`,
  },
  Warning:  {
    className: "warning",
    label: "WARNING",
    desc: "高風險網站",
    dot: "#E85D00",
    icon: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
  },
  Low_Risk: {
    className: "low-risk",
    label: "LOW RISK",
    desc: "待觀察",
    dot: "#B8860B",
    icon: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
  },
  Safe:     {
    className: "safe",
    label: "SAFE",
    desc: "安全",
    dot: "#1E7A3E",
    icon: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>`,
  },
};

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function getHostname(url) {
  try { return new URL(url).hostname; } catch { return url ?? ""; }
}

function render(data) {
  const emptyView  = document.getElementById("empty-view");
  const resultView = document.getElementById("result-view");

  if (!data) {
    emptyView.classList.remove("hidden");
    resultView.classList.add("hidden");
    return;
  }

  emptyView.classList.add("hidden");
  resultView.classList.remove("hidden");

  const meta = STATUS_META[data.status] ?? {
    className: "",
    label: data.status ?? "UNKNOWN",
    desc: "",
    dot: "#ddd",
    icon: "",
  };

  // Header dot
  document.getElementById("status-dot").style.background = meta.dot;

  // Badge
  const badge = document.getElementById("status-badge");
  badge.className = `badge ${meta.className}`;
  document.getElementById("badge-icon").innerHTML = meta.icon;
  document.getElementById("badge-label").textContent = meta.label;

  // Score
  const scoreEl = document.getElementById("score-num");
  scoreEl.className = `score-num ${meta.className}`;
  scoreEl.textContent = escapeHtml(data.risk_score);

  // Details
  document.getElementById("detail-url").textContent = getHostname(data.url);
  document.getElementById("detail-url").title = data.url ?? "";

  const ipRow = document.getElementById("ip-row");
  if (data.ip) {
    document.getElementById("detail-ip").textContent = data.ip;
    ipRow.style.display = "flex";
  } else {
    ipRow.style.display = "none";
  }

  const typeEl = document.getElementById("detail-type");
  typeEl.textContent = data.is_new ? "新網址" : "已知網址";
  typeEl.className = data.is_new ? "pill new-url" : "pill";

  document.getElementById("detail-desc").textContent = meta.desc;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) { render(null); return; }
  const key = `tab:${tab.id}`;
  const obj = await chrome.storage.session.get(key);
  render(obj[key] ?? null);
}

init();

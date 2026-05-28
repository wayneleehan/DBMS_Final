// 在每個網頁右上角注入一張浮動卡片,顯示後端回的 status。
// 用 Shadow DOM 隔離,避免被網頁自己的 CSS 污染。

const HOST_ID = "antifraud-widget-host";
const SAFE_AUTO_HIDE_MS = 3000;

const STATUS_META = {
  Blocked:  { className: "blocked",  label: "BLOCKED",  desc: "已知詐騙網站" },
  Warning:  { className: "warning",  label: "WARNING",  desc: "高風險網站" },
  Low_Risk: { className: "low-risk", label: "LOW RISK", desc: "待觀察" },
  Safe:     { className: "safe",     label: "SAFE",     desc: "安全" },
};

let shadowRoot = null;
let hideTimer = null;

function ensureHost() {
  let host = document.getElementById(HOST_ID);
  if (host && shadowRoot) return;

  host = document.createElement("div");
  host.id = HOST_ID;
  // `all: initial` 把網頁繼承下來的樣式重置;position fixed 釘在右上角
  host.style.cssText =
    "all: initial; position: fixed; top: 16px; right: 16px; z-index: 2147483647;";
  (document.body || document.documentElement).appendChild(host);

  shadowRoot = host.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = `
    <style>
      :host { all: initial; }
      .card {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #ffffff;
        color: #212121;
        border: 1px solid #e0e0e0;
        border-radius: 10px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        padding: 12px 14px;
        width: 240px;
        opacity: 0;
        transform: translateY(-8px);
        transition: opacity 180ms ease, transform 180ms ease;
        pointer-events: auto;
      }
      .card.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .row-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .status-group { display: flex; align-items: center; gap: 8px; }
      .dot { width: 10px; height: 10px; border-radius: 50%; }
      .label { font-size: 14px; font-weight: 700; letter-spacing: 0.5px; }
      .close {
        background: none; border: none; cursor: pointer;
        font-size: 16px; color: #9e9e9e; padding: 0 4px;
        line-height: 1;
      }
      .close:hover { color: #424242; }
      .desc { font-size: 12px; color: #616161; margin-bottom: 8px; }
      .score-row {
        display: flex; justify-content: space-between; align-items: baseline;
        border-top: 1px solid #f0f0f0; padding-top: 8px;
      }
      .score-key { font-size: 11px; color: #757575; }
      .score-val { font-size: 20px; font-weight: 700; }

      .blocked  .dot, .blocked  .score-val { background: #D32F2F; }
      .blocked  .label, .blocked  .score-val { color: #D32F2F; }
      .blocked  .dot { background: #D32F2F; }
      .warning  .dot { background: #F57C00; }
      .warning  .label, .warning  .score-val { color: #F57C00; }
      .low-risk .dot { background: #FBC02D; }
      .low-risk .label, .low-risk .score-val { color: #F9A825; }
      .safe     .dot { background: #2E7D32; }
      .safe     .label, .safe     .score-val { color: #2E7D32; }
    </style>
    <div id="card-slot"></div>
  `;
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function dismiss() {
  clearHideTimer();
  const card = shadowRoot?.querySelector(".card");
  if (!card) return;
  card.classList.remove("visible");
  // 等動畫結束再從 DOM 移走
  setTimeout(() => {
    const host = document.getElementById(HOST_ID);
    host?.remove();
    shadowRoot = null;
  }, 200);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function render(data) {
  if (!data) return;
  ensureHost();
  clearHideTimer();

  const meta = STATUS_META[data.status] ?? {
    className: "", label: data.status ?? "UNKNOWN", desc: "",
  };

  const slot = shadowRoot.getElementById("card-slot");
  slot.innerHTML = `
    <div class="card ${meta.className}">
      <div class="row-top">
        <div class="status-group">
          <span class="dot"></span>
          <span class="label">${escapeHtml(meta.label)}</span>
        </div>
        <button class="close" title="關閉">&times;</button>
      </div>
      <div class="desc">${escapeHtml(meta.desc)}</div>
      <div class="score-row">
        <span class="score-key">風險分數</span>
        <span class="score-val">${escapeHtml(data.risk_score)}</span>
      </div>
    </div>
  `;

  const card = slot.querySelector(".card");
  // 下一輪 paint 再加 visible,讓 transition 生效
  requestAnimationFrame(() => card.classList.add("visible"));

  slot.querySelector(".close").addEventListener("click", dismiss);

  // Safe 自動收;其他 status 留著
  if (data.status === "Safe") {
    hideTimer = setTimeout(dismiss, SAFE_AUTO_HIDE_MS);
  }
}

// 收 background 主動推的訊息
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "STATUS_UPDATE") {
    render(msg.data);
  }
});

// 載入時主動問一次當前狀態,處理 background 已經拿到回應的 race
chrome.runtime.sendMessage({ type: "GET_STATUS" }, (resp) => {
  if (chrome.runtime.lastError) return;  // background 還沒醒等情況
  if (resp?.data) render(resp.data);
});

const BACKEND_URL = "http://localhost:8000/api/v1/visits";

// 後端回的 4 個 status 對應到工具列圖示徽章的視覺
// (text 限制 4 字元;太長會被裁掉)
const STATUS_BADGE = {
  Blocked:  { text: "X", color: "#D32F2F" },  // 紅:已封鎖
  Warning:  { text: "!", color: "#F57C00" },  // 橘:警告
  Low_Risk: { text: "?", color: "#FBC02D" },  // 黃:待觀察
  Safe:     { text: "",  color: "#000000" },  // 安全 → 清除徽章
};

// 用 Google DNS-over-HTTPS 把 hostname 解成 IPv4。失敗就回 null,
// 後端會自己 fallback 做 socket.gethostbyname。
async function resolveIP(hostname) {
  try {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    // Answer 是個 array,每項有 type(1=A record)和 data(IP 字串)
    const aRecord = data.Answer?.find((a) => a.type === 1);
    return aRecord?.data ?? null;
  } catch {
    return null;
  }
}

async function checkVisit(tabId, url) {
  try {
    const hostname = new URL(url).hostname;
    const ip = await resolveIP(hostname);

    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        visited_at: new Date().toISOString(),
        ip_address: ip,  // 解析失敗會是 null,後端會自己 fallback
      }),
    });

    if (!res.ok) {
      console.error(`Backend rejected (${res.status}): ${url}`);
      return;
    }

    const data = await res.json();
    const tag = data.is_new ? "new" : "existing";
    console.log(` [${data.status}] score=${data.risk_score} (${tag}) ip=${ip ?? "?"} → ${url}`);

    updateBadge(tabId, data.status);
    const payload = { ...data, ip, checked_at: Date.now() };
    storeTabStatus(tabId, payload);
    pushToContentScript(tabId, payload);
    maybeNotify(data);
  } catch (err) {
    console.error(` Network error for ${url}:`, err);
  }
}

// popup.js 跟 content.js 都讀這份 storage 取得當前分頁狀態。
// 用 session 是因為瀏覽器關掉就該清掉,不需要跨 session 保留。
function storeTabStatus(tabId, payload) {
  chrome.storage.session.set({ [`tab:${tabId}`]: payload });
}

// 主動把最新狀態推到頁面內的 content script,讓浮動卡片即時更新。
// content script 還沒載完(或頁面不允許注入)時 sendMessage 會 reject,直接吞掉。
function pushToContentScript(tabId, payload) {
  chrome.tabs.sendMessage(tabId, { type: "STATUS_UPDATE", data: payload }).catch(() => {});
}

// content script 載入時會主動來要一次當前狀態(處理「先有 response 才有 script」的 race)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "GET_STATUS" && sender.tab) {
    const key = `tab:${sender.tab.id}`;
    chrome.storage.session.get(key).then((obj) => sendResponse({ data: obj[key] ?? null }));
    return true;  // 告訴 chrome.runtime 我們會非同步呼叫 sendResponse
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`tab:${tabId}`);
});

// 把徽章貼到「該分頁」的工具列圖示;不同分頁互不干擾
function updateBadge(tabId, status) {
  const badge = STATUS_BADGE[status] ?? { text: "", color: "#000000" };
  chrome.action.setBadgeText({ tabId, text: badge.text });
  if (badge.text) {
    chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color });
  }
}

// 風險夠高就跳系統通知(macOS 右上角、Windows 右下角)。
// 同 URL 30 秒內只通知一次,避免來回切分頁洗版。
const NOTIFY_STATUSES = new Set(["Blocked", "Warning"]);
const recentNotifications = new Map();  // url → 上次通知的 timestamp
const NOTIFY_COOLDOWN_MS = 30_000;

function maybeNotify({ url, status, risk_score }) {
  if (!NOTIFY_STATUSES.has(status)) return;

  const now = Date.now();
  const last = recentNotifications.get(url);
  if (last && now - last < NOTIFY_COOLDOWN_MS) return;
  recentNotifications.set(url, now);

  const titleByStatus = {
    Blocked: " 已知詐騙網站",
    Warning: " 高風險網站警告",
  };

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: titleByStatus[status] ?? "網站警告",
    message: `${url}\n風險分數:${risk_score}`,
    priority: 2,
  });
}

// 註冊在最外層,Chrome 每次喚醒 Service Worker 時都會重新掛上 listener
// (MV3 的 worker 閒置時會被積極回收,寫在函式裡會失效)。
chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
  // 只在 URL 真的改變時才觸發;略過標題、favicon、載入狀態等事件。
  if (!changeInfo.url) return;

  // 過濾瀏覽器內部頁面(chrome://、about:blank 等),這些不是真的瀏覽行為,只會洗版 log。
  if (!/^https?:\/\//i.test(changeInfo.url)) return;

  checkVisit(tabId, changeInfo.url);
});

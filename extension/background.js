const BACKEND_URL = "http://localhost:8000/api/v1/visits";

async function sendVisit(url) {
  try {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        visited_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      console.error(`❌ Backend rejected (${res.status}): ${url}`);
      return;
    }
    console.log(`✅ Sent: ${url}`);
  } catch (err) {
    console.error(`❌ Network error for ${url}:`, err);
  }
}

// 註冊在最外層,Chrome 每次喚醒 Service Worker 時都會重新掛上 listener
// (MV3 的 worker 閒置時會被積極回收,寫在函式裡會失效)。
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, _tab) => {
  // 只在 URL 真的改變時才觸發;略過標題、favicon、載入狀態等事件。
  if (!changeInfo.url) return;

  // 過濾瀏覽器內部頁面(chrome://、about:blank 等),這些不是真的瀏覽行為,只會洗版 log。
  if (!/^https?:\/\//i.test(changeInfo.url)) return;

  sendVisit(changeInfo.url);
});

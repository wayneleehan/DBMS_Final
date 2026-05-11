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

// Registered at top level so the listener re-attaches every time Chrome wakes
// the Service Worker (MV3 workers are evicted aggressively when idle).
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, _tab) => {
  // Only fire when the URL itself changed; ignores title/favicon/load-state events.
  if (!changeInfo.url) return;

  // Skip browser-internal pages — they are not real navigations and clutter logs.
  if (!/^https?:\/\//i.test(changeInfo.url)) return;

  sendVisit(changeInfo.url);
});

# Web Tracker MVP — Chrome 擴充功能

偵測 Chrome 分頁的 URL 變化,並 POST 到本地的 FastAPI 後端。
這是 MVP 階段,只用來驗證端對端流程是否打通——**沒有資料庫、沒有驗證、沒有批次傳送**。

## 載入擴充功能到 Chrome

1. 打開 `chrome://extensions`
2. 右上角開啟 **開發人員模式 (Developer mode)**
3. 點 **載入未封裝項目 (Load unpacked)**
4. 選這個 `extension/` 資料夾
5. 卡片上應該會出現「Web Tracker MVP」

## 查看 Service Worker 的 console log

在擴充功能卡片上,點 **Service Worker** 連結(在 "Inspect views" 旁邊)。
會跳出一個 DevTools 視窗,`background.js` 的 `console.log` / `console.error` 都會輸出在那裡。

如果連結顯示 "inactive"(休眠中),隨便切換一下分頁網址就會把 worker 喚醒。

## 端對端測試流程

1. **啟動後端**(在專案根目錄):
   ```bash
   uv run uvicorn app.main:app --reload
   ```

2. **先用 Swagger 確認後端 OK**:打開 `http://localhost:8000/docs`,
   試 `POST /api/v1/visits`,Body 填 `{"url": "https://example.com"}`。
   後端 terminal 應該會印出 `📥 Visit (...): ...`。

3. **載入擴充功能**(步驟見上方)。

4. **觸發一次網頁瀏覽**:開新分頁,進入 `https://example.com`。

5. **預期看到的結果**:
   - 後端 terminal:`📥 Visit (...): https://example.com → <status>/<risk_score>`
   - Service Worker console:`✅ [<status>] score=<n> (new|existing) → https://example.com`
   - 工具列上擴充功能圖示會根據 status 貼**彩色徽章**:
     - 🔴 `X` = Blocked(已封鎖)
     - 🟠 `!` = Warning(警告)
     - 🟡 `?` = Low_Risk(待觀察)
     - (Safe → 沒徽章)

> 💡 想看到徽章,需要把擴充功能**釘選 (pin)** 到工具列:
> 點瀏覽器右上角拼圖 🧩 → 找到「Web Tracker MVP」→ 點圖釘。

### 系統通知

當後端回傳 `Blocked` 或 `Warning` 時,會在作業系統右上角(macOS)或右下角(Windows)
**自動跳出原生通知**,顯示警告標題、URL 與風險分數。

- 同一個 URL 在 **30 秒**內只會通知一次,避免來回切分頁洗版。
- 第一次出現通知時,macOS 可能會問你「是否允許 Google Chrome 通知」,選**允許**。
- 如果都沒看到通知,檢查:
  1. macOS 「系統設定 → 通知 → Google Chrome」要打開
  2. 「勿擾模式 (Do Not Disturb)」沒開
  3. Service Worker console 沒有 `Unable to download all specified images` 之類的錯誤(代表 icon.png 路徑壞了)

## 疑難排解

- **Service Worker console 沒任何 log** → worker 可能被回收了,再瀏覽一個網頁喚醒它即可。
- **`Failed to fetch` 或 CORS 錯誤** → 確認後端有跑在 `localhost:8000`,且 `app/main.py` 已加上 CORS middleware。
- **後端沒收到、擴充功能也沒  報錯** → 檢查 `manifest.json` 的 `host_permissions` 是否跟後端網址一致。

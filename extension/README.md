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
   後端 terminal 應該會印出 `📥 Received URL: ...`。

3. **載入擴充功能**(步驟見上方)。

4. **觸發一次網頁瀏覽**:開新分頁,進入 `https://example.com`。

5. **預期看到的結果**:
   - 後端 terminal:`📥 Received URL: https://example.com`
   - Service Worker console:`✅ Sent: https://example.com`

## 疑難排解

- **Service Worker console 沒任何 log** → worker 可能被回收了,再瀏覽一個網頁喚醒它即可。
- **`Failed to fetch` 或 CORS 錯誤** → 確認後端有跑在 `localhost:8000`,且 `app/main.py` 已加上 CORS middleware。
- **後端沒收到、擴充功能也沒  報錯** → 檢查 `manifest.json` 的 `host_permissions` 是否跟後端網址一致。

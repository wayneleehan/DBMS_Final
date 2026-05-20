# Frontend

使用 **React 19 + Vite** 建置，需要 Node.js 環境。

## 開啟方式

```bash
cd frontend
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:5173`

## 目錄結構

```
frontend/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── main.jsx          # 入口，掛載到 #root
│   ├── App.jsx           # 根元件，管理 auth state 與頁面路由
│   ├── components.jsx    # 共用 UI 元件：I（圖示庫）、Sidebar、Topbar、StatusBadge、CaseBadge、RiskRing、Stat
│   ├── data.jsx          # Mock 資料（MOCK）與 helper（statusMeta、caseStatusMeta、riskColor）
│   ├── user-pages.jsx    # 使用者頁面：LoginPage、WebsiteOverview、UserReport、UserProfile
│   ├── admin-pages.jsx   # 管理員頁面：AdminReview、ReviewDetail、AdminAlert、AdminProfile
│   ├── tweaks-panel.jsx  # 右下角原型調整面板（開發用）
│   └── styles.css        # 全域樣式
├── package.json
└── vite.config.js
```

## 架構

### 路由

無 React Router，用 React state 切換頁面：

```
auth = null     → LoginPage
auth = "user"   → userPage: "overview" | "report" | "profile"
auth = "admin"  → adminPage: "review" | "detail" | "alert" | "aprofile"
```

### 資料流

```
data.jsx  →  export MOCK, riskColor, statusMeta, ...
              ↓  import
          各頁面元件直接使用（無 context 或 store）
```

### 元件結構

```
App（auth / userPage / adminPage state）
  ├─ LoginPage（auth = null）
  └─ Sidebar + Topbar + 頁面元件（auth 登入後）
       ├─ [user]  WebsiteOverview / UserReport / UserProfile
       └─ [admin] AdminReview / ReviewDetail / AdminAlert / AdminProfile
```

## Demo 帳號

| 身分 | Email | 密碼 |
|------|-------|------|
| 使用者 | zhian.chen@example.com | demo1234 |
| 管理員 | lihong.wang@example.com | admin1234 |

# 詐騙聯防預警系統 — 後端 API

> 瀏覽器擴充套件配套的詐騙網站偵測與安全度評分服務

DBMS 期末專案。當使用者瀏覽新網站時，瀏覽器擴充套件會即時將網址送回本服務，比對「[165 全民防騙網](https://165.npa.gov.tw/)」的反詐騙網站公開清單與自家詐騙特徵庫，計算 Risk Score 後回傳安全度。系統同時支援使用者檢舉、管理員裁決、申訴流程與完整稽核紀錄。

---

## 系統介紹

### 主要功能
- **即時 URL 風險查詢**：擴充套件回報網址 → 後端評分 → 回傳安全度
- **雙重比對機制**：政府 165 名單 + 自家詐騙特徵庫（關鍵字 / Regex / IP 區段）
- **動態風險評分**：依特徵命中與權重累計，並記錄 Risk_History 軌跡
- **檢舉與信任分數**：使用者 `Reliability_Score` 機制抑制濫檢舉
- **申訴與裁決流程**：站長可申訴，支援自連接「再申訴」結構
- **系統級警報**：偵測 CIB 攻擊（短時間集中檢舉）、Cluster Warning（同 IP 段集體可疑）
- **完整稽核**：管理員所有操作以 JSON Old/New 形式記錄於 `AUDIT_LOG`

### 資料庫架構（`anti_fraud_db`）
共 13 張資料表，依外鍵依賴分四層：

| 層級 | 資料表 | 說明 |
|---|---|---|
| 基礎層 | `SERVER_INFO`, `USERS`, `ADMIN`, `FRAUD_PATTERN` | 無外鍵依賴 |
| L1 | `WEBSITE`, `AUDIT_LOG` | 依賴基礎層 |
| L2 | `Risk_History`, `EVALUATION`, `CLICK_EVENT`, `Report` | 依賴 L1 |
| L3 | `APPEAL`, `ruling` | 申訴 / 裁決流程（`APPEAL` 自連接以支援再申訴） |
| 獨立 | `ALERT_LOGS` | 系統級警報 |

完整 schema 請見 [`database/createDB.sql`](database/createDB.sql)。

### 目前 API 端點

| Method | Path | 用途 |
|---|---|---|
| GET | `/` | 健康檢查 |
| GET | `/test-db` | 測試 MySQL 連線、列出 `WEBSITE` 前 5 筆 |
| POST | `/api/v1/visits` | 擴充功能回報瀏覽紀錄、回傳網站 status |
| POST | `/api/v1/reports` | 使用者手動通報網址 |
| POST | `/api/v1/warnings/cib` | 觸發 CIB(協同造假)監控 |
| POST | `/api/v1/warnings/cluster` | 觸發機房集群預警監控 |
| POST | `/api/v1/appeals/` | 使用者提交申訴 / 再申訴 |
| POST | `/api/v1/admin/review` | 管理員裁決申訴案件 |

服務啟動後可在 http://127.0.0.1:8000/docs 看自動產生的 Swagger UI。

### 技術棧

| 類別 | 技術 |
|---|---|
| 語言 | Python 3.13 |
| Web 框架 | FastAPI 0.136 |
| DB 驅動 / 連線池 | SQLAlchemy 2.0 Core(無 ORM)+ PyMySQL |
| 資料驗證 | Pydantic 2 / pydantic-settings |
| 評分管線輔助 | requests + beautifulsoup4(網頁爬蟲)、python-whois(網域年齡) |
| 資料庫 | MySQL 8.x（本機 / AWS RDS） |
| 套件管理 | uv |
| 推薦 GUI | TablePlus |

---

# 環境建構與安裝

## 環境需求
- **Python 3.11.x**
- **MySQL 8.0+**
- **TablePlus** 或其他 MySQL GUI 工具
- macOS / Windows / Linux 皆可

## 1. Clone 專案
```bash
git clone https://github.com/wayneleehan/DBMS_Final.git
cd DBMS_Final
```

## 2. 安裝相依套件

### uv

```bash
# 一次性安裝 uv
# macOS:
brew install uv
# Windows (PowerShell):
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# 建環境並安裝
uv venv
uv pip install -r requirements.txt
```

之後執行任何指令前綴 `uv run`（例如 `uv run uvicorn app.main:app --reload`），不必手動啟動 venv。

## 3. 設定環境變數

複製範本並填入連線資訊：

```bash
cp .env.example .env       # macOS / Linux
copy .env.example .env     # Windows
```

編輯 `.env`，填入本機 MySQL 密碼或向組長索取 AWS RDS 連線資訊。

> 💡 **開發階段建議用本機 MySQL**，速度快又不會撞到組員資料；最終整合測試再切到 AWS RDS。切換時只改 `.env` 即可，程式碼一字都不用動。

## 4. 初始化資料庫

開啟 TablePlus（或任何 MySQL client），依序執行 [`database/`](database/) 下的 SQL 檔：

| 順序 | 檔案 | 用途 | 何時執行 |
|---|---|---|---|
| 1️⃣ | `createDB.sql` | 建立 `anti_fraud_db` 與 13 張資料表 | 全新環境一次 |
| 2️⃣ | `2mockData.sql` | 寫入 26 筆測試資料 | 建表後 |
| 🔄 | `resetDB.sql` | TRUNCATE 全部資料、ID 歸零 | 資料髒掉時才用 |

詳細連線教學請見 [`database/hackmd.md`](database/hackmd.md)。

## 5. 啟動服務

```bash
# 方案 B
uv run uvicorn app.main:app --reload
```

打開瀏覽器驗證：
- http://127.0.0.1:8000 → 看到歡迎訊息
- http://127.0.0.1:8000/test-db → 回傳 5 筆 `WEBSITE` 資料 = 連線成功 ✅
- http://127.0.0.1:8000/docs → 互動式 API 文件

---

## 專案結構
```
DBMS_Final/
├── app/
│   ├── main.py              # FastAPI 進入點，串接所有路由
│   ├── core/                # 核心設定（DB 連線引擎 / 環境變數）
│   ├── crud/                # 原生 SQL 指令，按資料表分檔
│   ├── schemas/             # Pydantic 資料格式驗證
│   ├── services/            # 業務邏輯層（複雜運算）
│   ├── api/                 # API 路由定義（Endpoints）
│   └── utils/               # 共用工具（爬蟲、whois 等）
├── database/
│   ├── createDB.sql         # 建表
│   ├── 2mockData.sql        # 測試資料
│   ├── resetDB.sql          # 重置
│   └── hackmd.md            # 詳細連線教學
├── requirements.txt
├── .env.example             # 環境變數範本
├── .gitignore
└── .gitattributes           # 跨平台行尾統一
```

---

## 架構分工（每個資料夾的角色與規則）

請依照職責把程式碼放對位置。各層由下而上呼叫：`api` → `services` → `crud` → `core`。

### 1. `core/` — 核心設定
- **用途**：專案的「心臟」，讀取 `.env`、建立 SQLAlchemy 引擎與連線池
- **規則**：⚠️ **已架設好，開發時請勿修改**。需要 DB session 時：
  ```python
  from app.core.database import get_db
  ```

### 2. `crud/` — SQL 指令總部
- **用途**：專門存放原生 SQL（透過 `sqlalchemy.text()`）
- **檔案規則**：**按資料表實體分檔**，例如：
  - `crud/user.py` → 所有對 `USERS` 的查詢 / 寫入
  - `crud/website.py` → 所有對 `WEBSITE` 的 SELECT / UPDATE
- **協作規則**（請務必遵守）：
  - ✅ 你的功能要用到某張表 → 在對應檔案**新增函式**
  - ❌ **不要修改別人寫好的舊函式**，只能往後追加
  - 🔄 **推 code 前先 `git pull`**，避免推上去才衝突
- **例子**：`SCRUM-24` 要算 website 風險分數 → 在 `crud/website.py` 新增 `def get_website_for_scoring(db, site_id): ...`

### 3. `schemas/` — 資料格式定義
- **用途**：定義 API 的「進」與「出」JSON 長相，使用 Pydantic
- **不負責 SQL**，只負責**型別驗證**（例如「分數必須是 float」、「URL 必須是字串」）
- **例子**：
  ```python
  class WebsiteCheckRequest(BaseModel):
      url: str
  
  class WebsiteCheckResponse(BaseModel):
      url: str
      risk_score: float
      status: Literal["Safe", "Low_Risk", "Warning", "Blocked"]
  ```

### 4. `services/` — 業務邏輯層（大腦）
- **用途**：處理**複雜運算**。如果功能不只是存取資料、還要計算或組合多個 CRUD，邏輯寫這裡
- **不直接寫 SQL**，而是去呼叫 `crud/` 拿資料
- **例子**：`SCRUM-24` 風險評分演算法 → `services/scoring.py` 裡實作演算法，內部呼叫 `crud.website.get_*` 與 `crud.fraud_pattern.get_*`

### 5. `api/` — 路由接口
- **用途**：定義 URL 路徑（API Endpoints），接收前端 / 擴充套件的請求
- **不要在這裡寫商業邏輯或 SQL**，只做：接收 → 驗證（用 schemas）→ 呼叫 services 或 crud → 回傳
- **例子**：
  ```python
  @router.post("/api/v1/scoring")
  def score_url(req: WebsiteCheckRequest, db: Session = Depends(get_db)):
      return scoring_service.evaluate(db, req.url)
  ```

### 6. `main.py` — 程式進入點
- **用途**：整個專案的起跑線，啟動 FastAPI 並把 `api/` 下的所有 router 串起來

---

## 開發流程

### 分支策略
```
main                    ← 穩定版，僅接受合併
 └─ dev                 ← 整合分支
     └─ scrum-XX-描述   ← 每個任務一條（Scrum 命名）
```

開發新功能：
```bash
git checkout dev
git pull origin dev
git checkout -b scrum-XX-your-feature
# ... 開發與 commit ...
git push origin scrum-XX-your-feature
# 在 GitHub 開 PR 合到 dev
```

### 加新依賴
```bash
uv pip install <package>
# 同樣手動更新 requirements.txt
```
---

## 常見問題

### Q1: `pip install -r requirements.txt` 在 Mac 上失敗，看不懂錯誤
確認 `requirements.txt` 是 **UTF-8 編碼**而非 UTF-16。若是 Windows PowerShell 產生的，請改用：
```powershell
pip freeze | Out-File -Encoding utf8 requirements.txt
```

### Q2: 連線 MySQL 跳 `Access denied for user 'root'@'localhost'`
多半是 `.env` 密碼沒對。本機 MySQL 安裝時設定的密碼要寫進 `DATABASE_URL`；AWS RDS 用組長提供的帳密。

### Q3: Windows 同學 commit 後，diff 顯示「整個檔案都改了」
行尾（CRLF / LF）不一致。確認 [`.gitattributes`](.gitattributes) 存在於專案根目錄後重新 clone 即可。

### Q4: `/test-db` 回 `資料庫連線失敗：(2003, ...)`
MySQL 沒啟動。  
- macOS: `brew services start mysql`  
- Windows: 服務管理員啟動 MySQL80

### Q5: 想在本機與 AWS RDS 之間切換
只改 `.env` 的 `DATABASE_URL`，程式碼不用動。SQLAlchemy 已抽象掉底層差異。

---

## 相關文件
- 詳細資料庫連線教學：[`database/hackmd.md`](database/hackmd.md)
- API 自動文件：啟動後 http://127.0.0.1:8000/docs
- 資料表 ER 設計：見 `createDB.sql` 註解

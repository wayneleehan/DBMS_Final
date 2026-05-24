# `app/` — FastAPI 後端

詐騙聯防預警系統的後端應用程式。採分層架構,資料流由外往內:

```
HTTP request
   ↓
api/        ← 路由接口、Pydantic 驗證、auth 守門
   ↓
services/   ← 商業邏輯、跨表編排、外部 API 整合
   ↓
crud/       ← 純 SQL 查詢/異動,按資料表分檔
   ↓
core/       ← DB engine / Session(讀 .env、建連線池)
   ↓
MySQL
```

## 各層職責摘要

| 資料夾 | 角色 |
|--------|------|
| [core/](core/) | DB 連線、環境變數 — **不要動** |
| [api/](api/) | URL endpoints、auth 守門、payload 驗證 |
| [api/v1/](api/v1/) | 第一版業務 API |
| [crud/](crud/) | 原生 SQL,按 DB 表實體分檔(`user.py`、`website.py` ...) |
| [schemas/](schemas/) | Pydantic 模型:API request / response 的 JSON 結構驗證 |
| [services/](services/) | 業務邏輯、跨多個 CRUD / 外部服務的編排 |
| [utils/](utils/) | 通用工具(目前只有爬蟲) |
| [main.py](main.py) | 進入點:建 FastAPI、加 middleware、註冊所有 router |

## 常用指令

```bash
# 啟動(從專案根目錄)
uv run uvicorn app.main:app --reload

# 匯入 NPA 詐騙網站清單(一次性)
uv run python -m app.crud.website
```

新增功能前請先看[根目錄的 `CLAUDE.md`](../CLAUDE.md),那邊有詳細的「下筆前自我檢查」清單。

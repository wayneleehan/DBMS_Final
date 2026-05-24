# `api/` — 路由接口層

定義 FastAPI 的 endpoints。**所有 router 都統一放在 [v1/](v1/) 子資料夾**。
本層只放跨版本共用的東西(目前只有 `deps.py`)。

## 設計原則

- 只接收請求、驗證(用 schemas/)、呼叫 services/ 或 crud/、回傳結果
- 不寫 SQL,也不放複雜邏輯
- 認證守門用 [deps.py](deps.py) 提供的 dependency

## 檔案

- **`deps.py`** — 共用 dependency:`require_login`、`require_user`、`require_admin`
- **`v1/`** — 第一版業務 API(所有 router 都在這裡)

## 為什麼分版本層?

未來如果要做 break-change(改 response 格式、改路徑),
新版可以放 `v2/` 而不動 `v1/`,前端可以漸進遷移。

## 加新 endpoint 的流程

1. 在 `schemas/` 定義 request / response Pydantic model
2. 商業邏輯寫在 `services/`
3. SQL 寫在 `crud/<表名>.py`
4. 在 `api/v1/<feature>.py` 定義 router + endpoint,呼叫 service
5. 到 `main.py` 加 `app.include_router(...)`

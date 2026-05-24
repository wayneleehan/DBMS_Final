# `schemas/` — 資料格式定義(Pydantic)

定義 API 進出的 JSON 結構,做型別驗證與自動產生 OpenAPI 文件。

## 設計原則

- **只負責驗證,不寫 SQL**
- 一個 endpoint 通常需要兩個 model:`XxxRequest`(進)、`XxxResponse`(出)
- 共用的資料結構(例如 `UserInfo`)可以被多個 endpoint 重用

## 檔案

| 檔案 | 主要 model | 用於 |
|------|----------|------|
| `auth.py` | `LoginRequest`、`RegisterRequest`、`UserInfo`、`LoginResponse`、`LogoutResponse` | `/api/v1/auth/*` |
| `visit.py` | `VisitCreate`、`VisitResponse` | `POST /api/v1/visits` |
| `report.py` | `ReportCreate`、`ReportResponse`、`UserReportRow`、`UserReportStats` | `POST /api/v1/reports`、`GET /api/v1/users/me/reports`、`GET /api/v1/users/me/stats` |
| `appeal.py` | `AppealCreateRequest`、`AppealResponse` | `POST /api/v1/appeals/` |
| `admin_review.py` | `AdminReviewRequest`、`AdminReviewResponse`、`ReviewQueueItem`、`ReviewQueueCounts`、`ReportVerdictRequest`、`ReportVerdictResponse` | `/api/v1/admin/*` |
| `early_warning.py` | `CIBMonitorRequest`、`ClusterMonitorRequest`、`WarningResponse` | `/api/v1/warnings/*` |
| `website.py` | (尚未啟用) | 預留給未來 `GET /api/v1/websites` 用 |

## 命名慣例

- `XxxCreate` / `XxxRequest`:request body(輸入)
- `XxxResponse`:response body(輸出)
- `XxxInfo` / `XxxRow`:共用的「資料」物件(可放 request/response 內,或單獨回傳)

## 何時要加新檔 vs 改既有

- 新功能涉及新的概念(例如未來要做「使用者偏好」)→ 開新檔 `preferences.py`
- 現有功能加欄位 → 在對應檔追加 field 或新增 model class

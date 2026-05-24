# `services/` — 業務邏輯層

處理「複雜運算」與「跨多個 CRUD 的編排」。

## 設計原則

- 不直接寫 SQL,呼叫 `crud/` 拿/寫資料
- 處理 transaction(用 `db.commit()` / `db.rollback()`)
- 整合外部服務(scoring 系統的 DNS、爬蟲、WHOIS 等)
- API 層只呼叫 service,不直接打 crud(複雜功能時)

## 檔案

| 檔案 | 主要函式 | 對應 API |
|------|---------|---------|
| `auth_service.py` | `hash_password`、`verify_password`、`authenticate`、`restore_session_user` | `/api/v1/auth/*` |
| `visits_checking.py` | `check_visit` | `POST /api/v1/visits` |
| `report_service.py` | `handle_report` | `POST /api/v1/reports` |
| `appeal.py` | `process_appeal_submission` | `POST /api/v1/appeals/` |
| `admin_review.py` | `process_admin_adjudication`(申訴裁決)、`process_report_verdict`(舉報裁決) | `POST /api/v1/admin/review`、`POST /api/v1/admin/report-verdict` |
| `early_warning.py` | `monitor_cib_attack`、`monitor_cluster_warning` | `/api/v1/warnings/*` |
| `reputation_service.py` | `check_and_penalize_spam`、`process_appeal_impact` | (由其他 service 內部呼叫) |
| `scoring.py` | `run_scoring_pipeline`、`deep_analyze_background`、`get_status_by_score`、`score_url` | (由 visits/report service 內部呼叫) |

## 關鍵整合點

### `scoring.py`

URL 評分管線,給未知 URL 打分數並寫入 WEBSITE。流程:
1. 關鍵字計分(login / bank / verify ...)
2. DNS 解析 → 查 server_info IP 黑歷史
3. 寫入 WEBSITE
4. 排背景任務跑深度爬蟲(`deep_analyze_background`)

### `reputation_service.py`

集中管理使用者信譽分變動。其他 service 想加減信譽時呼叫這裡,不要自己直接動 USERS 表。

### `admin_review.py`

兩個流程(申訴 / 舉報)都是 atomic transaction,動 4-5 張表(主表 + Risk_History + AUDIT_LOG + ruling/USERS),錯誤 rollback。

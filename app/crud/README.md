# `crud/` — SQL 指令總部

按 DB 資料表分檔。每個檔放該表的純 SQL 操作(SELECT / INSERT / UPDATE),透過 `sqlalchemy.text()` 執行。

## ⚠️ 協作規則(請務必遵守)

1. ✅ 你的功能需要某張表 → 在對應檔案**追加新函式**
2. ❌ **千萬不要改別人寫好的舊函式內容**,只能往後加
3. 🔄 推 code 前先 `git pull`,避免衝突

## 檔案 ↔ DB 表對照

| 檔案 | 對應的表 | 主要函式 |
|------|---------|---------|
| `user.py` | `USERS` | `get_user_by_email`、`get_user_by_id`、`create_user`、`update_reliability_score`、`deduct_reliability_score` |
| `admin.py` | `ADMIN` + 跨表查詢 | `get_admin_by_email`、`get_admin_by_id`、`get_review_queue`、`get_review_queue_counts` |
| `website.py` | `WEBSITE` | `create_website`、`get_website_by_url`、`update_website_score`、`update_website_status_and_score`、`get_ip_block_stats`、`batch_increase_risk_score_by_ip`、`force_manual_review`、`import_npa_websites_from_csv` |
| `report.py` | `Report` | `create_report`、`count_recent_reports_for_cib`、`count_recent_reports_by_user`、`get_reports_with_website_by_user`、`get_user_report_stats`、`get_report_with_site` |
| `appeal.py` | `APPEAL` | `create_appeal`、`get_appeal_full_details`、`update_appeal_status` |
| `ruling.py` | `ruling` | `create_ruling` |
| `audit_log.py` | `AUDIT_LOG` | `create_audit_log` |
| `risk_history.py` | `Risk_History` | `create_risk_history`、`create_history` |
| `evaluation.py` | `EVALUATION` | `create_evaluation`、`check_evaluation_exists` |
| `fraud_pattern.py` | `FRAUD_PATTERN` | `get_all_patterns` |
| `server_info.py` | `SERVER_INFO` | `get_server_info_by_ip`、`ensure_server_info_exists` |
| `alert_logs.py` | `ALERT_LOGS` | `create_alert_log` |
| `click_event.py` | `CLICK_EVENT` | (尚未實作函式) |

## 注意:跨表查詢的歸屬

部分函式 SELECT 跨多張表(例如 `admin.get_review_queue` 同時 JOIN 4 張表)。
歸屬原則:**「資料最終是給誰用」就放哪**(`get_review_queue` 是給管理員看的,放在 `admin.py`)。

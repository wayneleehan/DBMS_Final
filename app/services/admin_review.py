from sqlalchemy import Connection
from app.crud import appeal, ruling, website, user, risk_history, audit_log
from app.crud import report as report_crud
from app.schemas.admin_review import AdminReviewRequest, ReportVerdictRequest
import json
from app.services.reputation_service import process_appeal_impact


# verdict 字串 → (WEBSITE.Status, Risk_Score, 通報者信譽 delta)
_VERDICT_MAP = {
    "safe":   ("Safe",    0.0,   -5.0),   # 誤報 → 扣分
    "warn":   ("Warning", 65.0,   3.0),   # 確實可疑 → 微獎
    "danger": ("Blocked", 100.0, 10.0),   # 確認為詐騙 → 大獎
}


def process_report_verdict(
    db: Connection, admin_id: int, request: ReportVerdictRequest
) -> dict:
    """管理員對「舉報案件」直接裁決,不經申訴。

    流程:查 Report → 更新 WEBSITE → 寫 Risk_History → 調整通報者信譽 → 寫 AUDIT_LOG
    Atomic transaction:錯誤 rollback。
    """
    if request.verdict not in _VERDICT_MAP:
        raise ValueError(f"verdict 必須是 'safe' / 'warn' / 'danger',收到:{request.verdict}")

    details = report_crud.get_report_with_site(db, request.report_id)
    if not details:
        raise ValueError(f"找不到 Report_ID = {request.report_id}")

    site_id = details["Site_ID"]
    reporter_id = details["User_ID"]
    old_status = details["Website_Status"]
    old_score = float(details["Risk_Score"] or 0)

    new_status, new_score, reputation_delta = _VERDICT_MAP[request.verdict]

    try:
        # 1. 更新 WEBSITE.Status / Risk_Score
        website.update_website_status_and_score(
            db, site_id, status=new_status, score=new_score
        )

        # 2. 寫風險歷史軌跡
        risk_history.create_risk_history(db, site_id, old_score, new_score)

        # 3. 調整通報者信譽(safe → 扣,warn/danger → 加)
        user.update_reliability_score(db, reporter_id, reputation_delta)

        # 4. 寫 AUDIT_LOG
        audit_log.create_audit_log(
            db=db,
            admin_id=admin_id,
            action_type="REVIEW_REPORT",
            old_data={"website_status": old_status, "risk_score": old_score},
            new_data={
                "website_status": new_status,
                "risk_score": new_score,
                "verdict": request.verdict,
                "note": request.note,
                "reporter_reputation_delta": reputation_delta,
            },
        )

        db.commit()
        return {
            "status": "success",
            "message": "舉報案件裁決完成,網站狀態與通報者信譽已更新。",
            "new_status": new_status,
            "new_risk_score": new_score,
        }
    except Exception as e:
        db.rollback()
        raise

def process_admin_adjudication(db: Connection, admin_id: int, request: AdminReviewRequest) -> dict:
    """處理管理員審核申訴的完整業務邏輯 (包含 Transaction)。
    admin_id 由 API 層從 session 帶入,不從 client 接受。
    """
    # 1. 獲取案件全面資訊
    details = appeal.get_appeal_full_details(db, request.appeal_id)
    if not details:
        raise ValueError("找不到該申訴案件")

    site_id = details["Site_ID"]
    old_score = details["Risk_Score"]
    old_status = details["Website_Status"]
    # 申訴人 ID (從原始 Report 中抓取)
    target_user_id = details["Reporter_ID"]

    try:
        # 2. 更新申訴狀態與建立裁決紀錄
        appeal.update_appeal_status(db, request.appeal_id, request.decision)
        ruling.create_ruling(db, admin_id, request.appeal_id, request.ruling_result)

        # 3. 傳入申訴人 ID 與裁決狀態 (request.decision 為 'Approved' 或 'Rejected')
        process_appeal_impact(db, target_user_id, request.decision)

        new_status = old_status
        new_score = old_score

        # 4. 根據裁決結果執行後續網站狀態動作
        if request.decision == 'Approved':
            # 申訴通過:解封網站,風險分數歸零
            new_status = 'Safe'
            new_score = 0.0
            website.update_website_status_and_score(db, site_id, status=new_status, score=new_score)
            risk_history.create_risk_history(db, site_id, old_score, new_score)

        # 5. 寫入管理員操作日誌 (Audit Log)
        audit_log.create_audit_log(
            db=db,
            admin_id=admin_id,
            action_type="REVIEW_APPEAL",
            old_data={"appeal_status": details["Appeal_Status"], "website_status": old_status},
            new_data={
                "appeal_status": request.decision,
                "website_status": new_status,
                "ruling": request.ruling_result,
                "score_impact": "Processed by appeal_impact logic"
            }
        )

        # 6. 確保資料一致性,提交 Transaction
        db.commit()
        return {"status": "success", "message": "裁決已成功送出,分數與網站狀態已同步更新。"}

    except Exception as e:
        db.rollback()
        raise
from sqlalchemy.orm import Session
from app.crud import appeal, ruling, website, user, risk_history, audit_log
from app.schemas.admin_review import AdminReviewRequest
import json
from app.services.reputation_service import process_appeal_impact

def process_admin_adjudication(db: Session, request: AdminReviewRequest) -> dict:
    """
    處理管理員審核申訴的完整業務邏輯 (包含 Transaction)。
    """
    # 1. 獲取案件全面資訊
    details = appeal.get_appeal_full_details(db, request.appeal_id)
    if not details:
        raise ValueError("找不到該申訴案件")

    site_id = details["Site_ID"]
    old_score = details["Risk_Score"]
    old_status = details["Website_Status"]
    # 申訴人 ID (在此假設從原始 Report 中抓取)
    target_user_id = details["Reporter_ID"]

    try:
        # 2. 更新申訴狀態與建立裁決紀錄
        appeal.update_appeal_status(db, request.appeal_id, request.decision)
        ruling.create_ruling(db, request.admin_id, request.appeal_id, request.ruling_result)

        # 3. 
        # 傳入申訴人 ID 與裁決狀態 (request.decision 為 'Approved' 或 'Rejected')
        process_appeal_impact(db, target_user_id, request.decision)

        new_status = old_status
        new_score = old_score

        # 4. 根據裁決結果執行後續網站狀態動作
        if request.decision == 'Approved':
            # 申訴通過：解封網站，風險分數歸零
            new_status = 'Safe'
            new_score = 0.0
            website.update_website_status_and_score(db, site_id, status=new_status, score=new_score)
            
            # 寫入風險歷史
            risk_history.create_risk_history(db, site_id, old_score, new_score)

        # 5. 寫入管理員操作日誌 (Audit Log)
        audit_log.create_audit_log(
            db=db,
            admin_id=request.admin_id,
            action_type="REVIEW_APPEAL",
            old_data={"appeal_status": details["Appeal_Status"], "website_status": old_status},
            new_data={
                "appeal_status": request.decision, 
                "website_status": new_status, 
                "ruling": request.ruling_result,
                "score_impact": "Processed by appeal_impact logic"
            }
        )

        # 6. 確保資料一致性，提交 Transaction
        db.commit()
        return {"status": "success", "message": "裁決已成功送出，分數與網站狀態已同步更新。"}

    except Exception as e:
        # Rollback 機制：發生錯誤時回滾
        db.rollback()
        raise e
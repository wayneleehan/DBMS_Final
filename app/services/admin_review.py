from sqlalchemy.orm import Session
from app.crud import appeal, ruling, website, user, risk_history, audit_log
from app.schemas.admin_review import AdminReviewRequest
import json

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

    try:
        # 2. 更新申訴狀態與建立裁決紀錄
        appeal.update_appeal_status(db, request.appeal_id, request.decision)
        ruling.create_ruling(db, request.admin_id, request.appeal_id, request.ruling_result)

        new_status = old_status
        new_score = old_score

        # 3. 根據裁決結果執行後續動作
        if request.decision == 'Approved':
            # 申訴通過：解封網站，風險分數歸零 (依貴團隊邏輯調整)
            new_status = 'Safe'
            new_score = 0.0
            website.update_website_status_and_score(db, site_id, status=new_status, score=new_score)
            
            # 寫入風險歷史
            risk_history.create_risk_history(db, site_id, old_score, new_score)

        elif request.decision == 'Rejected' and request.is_unreasonable:
            # 申訴駁回且無理取鬧：扣除申訴人(或檢舉人，視架構而定，此處假設扣除提交申訴的使用者，即站長) 的信譽分數
            # 註: 若資料庫 APPEAL 未直接綁定 User_ID，需從其他關聯抓取。此處假設扣除 Reporter_ID 僅為示範。
            user.deduct_reliability_score(db, details["Reporter_ID"], deduct_points=30.0)

        # 4. 寫入管理員操作日誌 (Audit Log)
        audit_log.create_audit_log(
            db=db,
            admin_id=request.admin_id,
            action_type="REVIEW_APPEAL",
            old_data={"appeal_status": details["Appeal_Status"], "website_status": old_status},
            new_data={"appeal_status": request.decision, "website_status": new_status, "ruling": request.ruling_result}
        )

        # 5. 確保資料一致性，提交 Transaction
        db.commit()
        return {"status": "success", "message": "裁決已成功送出並同步所有關聯狀態。"}

    except Exception as e:
        # Rollback 機制：發生錯誤時回滾，防止日誌與狀態不同步
        db.rollback()
        raise e
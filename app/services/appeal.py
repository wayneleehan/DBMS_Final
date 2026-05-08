from sqlalchemy.orm import Session
from app.crud import appeal as crud_appeal
from app.schemas.appeal import AppealCreateRequest

def process_appeal_submission(db: Session, appeal_data: AppealCreateRequest) -> dict:
    """
    處理使用者提交申訴或再申訴的邏輯。
    """
    # 💡 在這裡可以擴充商業邏輯，例如：
    # 1. 檢查 Report_ID 是否真的存在 (防呆)
    # 2. 如果 parent_appeal_id 有值，確認上一筆申訴狀態是否為 'Rejected'
    
    # 呼叫 CRUD 寫入資料庫
    new_appeal_id = crud_appeal.create_appeal(
        db=db,
        report_id=appeal_data.report_id,
        reason=appeal_data.reason,
        evidence_link=appeal_data.evidence_link,
        parent_appeal_id=appeal_data.parent_appeal_id
    )

    is_re_appeal = "再申訴" if appeal_data.parent_appeal_id else "申訴"

    return {
        "status": "success",
        "message": f"{is_re_appeal}已成功提交，系統將盡速派員審核。",
        "appeal_id": new_appeal_id
    }
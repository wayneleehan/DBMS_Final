from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.appeal import AppealCreateRequest, AppealResponse
from app.services import appeal as appeal_service

router = APIRouter(prefix="/api/v1/appeals", tags=["Appeals System (申訴系統)"])

@router.get("/", response_model=list)
def get_appeals(db: Session = Depends(get_db)):
    """
    取得所有待審核的申訴案件列表
    """
    from sqlalchemy import text
    query = text("""
        SELECT 
            A.Appeal_ID,
            A.Reason,
            A.Status,
            W.URL,
            W.Risk_Score,
            W.Status as Website_Status
        FROM APPEAL A
        JOIN Report R ON A.Report_ID = R.Report_ID
        JOIN WEBSITE W ON R.Site_ID = W.Site_ID
        WHERE A.Status = 'Pending'
    """)
    rows = db.execute(query).mappings().all()
    return [dict(row) for row in rows]

@router.post("/", response_model=AppealResponse)
def submit_appeal(request: AppealCreateRequest, db: Session = Depends(get_db)):
    """
    使用者提交申訴或再申訴。
    若為初次申訴，不需帶入 parent_appeal_id。
    若對初審結果不服提出再申訴，請帶入被駁回的 parent_appeal_id。
    """
    try:
        # 呼叫 Service 處理邏輯
        result = appeal_service.process_appeal_submission(db, request)
        return AppealResponse(**result)
    
    except Exception as e:
        # 發生任何錯誤時執行 Rollback 回滾，防止產生孤兒資料
        db.rollback()
        raise HTTPException(status_code=500, detail=f"提交申訴失敗，伺服器發生錯誤: {str(e)}")
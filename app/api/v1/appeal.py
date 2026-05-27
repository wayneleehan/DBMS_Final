from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Connection
from app.core.database import get_db
from app.crud import appeal as crud_appeal
from app.schemas.appeal import AppealCreateRequest, AppealResponse
from app.services import appeal as appeal_service

router = APIRouter(prefix="/api/v1/appeals", tags=["Appeals System (申訴系統)"])

@router.get("/", response_model=list)
def get_appeals(db: Connection = Depends(get_db)):
    """
    取得所有待審核的申訴案件列表
    """
    return crud_appeal.get_pending_appeals_with_website(db)

@router.post("/", response_model=AppealResponse)
def submit_appeal(request: AppealCreateRequest, db: Connection = Depends(get_db)):
    """
    使用者提交申訴或再申訴。
    若為初次申訴，不需帶入 parent_appeal_id。
    若對初審結果不服提出再申訴，請帶入被駁回的 parent_appeal_id。
    """
    try:
        result = appeal_service.process_appeal_submission(db, request)
        return AppealResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"提交申訴失敗，伺服器發生錯誤: {str(e)}")

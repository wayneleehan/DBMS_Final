from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import Connection
from app.core.database import get_db
from app.api.deps import require_admin, require_user
from app.crud import appeal as crud_appeal
from app.schemas.appeal import AppealCreateRequest, AppealResponse
from app.services import appeal as appeal_service


router = APIRouter(prefix="/api/v1/appeals", tags=["Appeals System (申訴系統)"])

@router.get("/", response_model=list)
def get_appeals(
    db: Connection = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """
    取得所有待審核的申訴案件列表
    """
    return crud_appeal.get_pending_appeals_with_website(db)

@router.post("/", response_model=AppealResponse)
async def submit_appeal(
    report_id: int = Form(...),
    reason: str = Form(...),
    parent_appeal_id: Optional[int] = Form(None),
    contact_info: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None), # 用 UploadFile 接收二進位檔案
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_user),
    ):
    """
    使用者提交申訴或再申訴。
    若為初次申訴，不需帶入 parent_appeal_id。
    若對初審結果不服提出再申訴，請帶入被駁回的 parent_appeal_id。
    """
    try:
        # 呼叫 Service 處理邏輯
        request_data = AppealCreateRequest(
            report_id=report_id,
            reason=reason,
            parent_appeal_id=parent_appeal_id,
            contact_info=contact_info
        )
         
        result = await appeal_service.process_appeal_submission(
            db,
            request_data,
            files,
            user_id=current_user["id"],
        )
        return AppealResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"提交申訴失敗，伺服器發生錯誤: {str(e)}")

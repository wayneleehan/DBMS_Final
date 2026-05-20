from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.admin_review import AdminReviewRequest, AdminReviewResponse
from app.services import admin_review as review_service

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Adjudication (管理員審核系統)"])

@router.post("/review", response_model=AdminReviewResponse)
def submit_admin_review(request: AdminReviewRequest, db: Session = Depends(get_db)):
    """
    管理員送出對申訴案件的裁決結果。
    此 API 保證 Atomic Transaction，若過程中發生錯誤將自動 Rollback。
    """
    try:
        result = review_service.process_admin_adjudication(db, request)
        return AdminReviewResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"裁決處理失敗，伺服器發生錯誤並已回滾: {str(e)}")
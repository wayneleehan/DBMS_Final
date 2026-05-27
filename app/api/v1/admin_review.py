from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Connection

from app.api.deps import require_admin
from app.core.database import get_db
from app.crud import admin as admin_crud
from app.schemas.admin_review import (
    AdminReviewRequest,
    AdminReviewResponse,
    ReportVerdictRequest,
    ReportVerdictResponse,
    ReviewQueueCounts,
    ReviewQueueItem,
)
from app.services import admin_review as review_service

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Adjudication (管理員審核系統)"])


@router.get("/queue", response_model=list[ReviewQueueItem])
def get_review_queue(
    status: str | None = Query(None, description="篩選:'待審核' / '申訴中' / 不帶=全部"),
    limit: int = Query(50, ge=1, le=200),
    db: Connection = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """審核佇列:UNION 待審核的 Report + 進行中的 Appeal。需管理員。"""
    return admin_crud.get_review_queue(db, status_filter=status, limit=limit)


@router.get("/queue/counts", response_model=ReviewQueueCounts)
def get_review_queue_counts(
    db: Connection = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """佇列各狀態計數,給 UI 篩選 chip 顯示用。"""
    return admin_crud.get_review_queue_counts(db)


@router.post("/review", response_model=AdminReviewResponse)
def submit_admin_review(
    request: AdminReviewRequest,
    db: Connection = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """管理員送出對申訴案件的裁決結果。需管理員登入。
    admin_id 從 session 拿,不從 request 接受。
    Atomic Transaction:錯誤時自動 Rollback。
    """
    try:
        result = review_service.process_admin_adjudication(db, admin["id"], request)
        return AdminReviewResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"裁決處理失敗,伺服器發生錯誤並已回滾: {str(e)}")


@router.post("/report-verdict", response_model=ReportVerdictResponse)
def submit_report_verdict(
    request: ReportVerdictRequest,
    db: Connection = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """管理員對「舉報案件」直接裁決(不經申訴流程)。需管理員登入。
    verdict='safe'/'warn'/'danger' 會對應到 WEBSITE.Status 與分數,
    並調整通報者信譽。Atomic transaction。
    """
    try:
        result = review_service.process_report_verdict(db, admin["id"], request)
        return ReportVerdictResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"裁決處理失敗,伺服器發生錯誤並已回滾: {str(e)}")

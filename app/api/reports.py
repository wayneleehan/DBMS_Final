from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.report import ReportCreate, ReportResponse
from app.services.report_service import handle_report

router = APIRouter(prefix="/api/v1", tags=["reports"])


@router.post("/reports", response_model=ReportResponse)
def create_report(
    payload: ReportCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    return handle_report(
        db,
        url=payload.url,
        reported_at=payload.reported_at,
        background_tasks=background_tasks,
        ip_address=payload.ip_address,
    )

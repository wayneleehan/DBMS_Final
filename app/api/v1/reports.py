from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.core.database import get_db
from app.schemas.report import ReportCreate, ReportResponse
from app.services.report_service import handle_report

router = APIRouter(prefix="/api/v1", tags=["reports"])


@router.post("/reports", response_model=ReportResponse)
def create_report(
    payload: ReportCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_user),
):
    """提交通報。需登入(一般使用者)。
    user_id 從 session 拿,client 端不能自己指定避免冒名通報。
    """
    return handle_report(
        db,
        user_id=current_user["id"],
        url=payload.url,
        reported_at=payload.reported_at,
        background_tasks=background_tasks,
        ip_address=payload.ip_address,
        category=payload.category,
        reason=payload.reason,
    )
